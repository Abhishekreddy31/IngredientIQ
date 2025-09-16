#!/usr/bin/env python3
import sys, re, time, concurrent.futures, requests

OFF_BASES = [
    "https://world.openfoodfacts.org",
    "https://in.openfoodfacts.org",
    "https://uk.openfoodfacts.org",
]
FIELDS = "code,product_name,brands,ingredients_text,ingredients,image_ingredients_url,countries"

CONNECT_TIMEOUT = 1.2   # seconds
READ_TIMEOUT    = 2.2   # seconds
GLOBAL_DEADLINE = 5.0   # seconds (hard limit)

UA = {"User-Agent": "IngredientIQ/1.0 (+local-fast-timeout)"}

def ean13_hint(code: str) -> bool:
    return len(code) == 13 and code.isdigit()

def split_ingredients(text: str):
    if not text:
        return []
    out, buf, depth = [], "", 0
    for ch in text:
        if ch == "(":
            depth += 1; buf += ch
        elif ch == ")":
            depth = max(0, depth-1); buf += ch
        elif ch in [",",";"] and depth == 0:
            if buf.strip(): out.append(buf.strip()); buf=""
        else:
            buf += ch
    if buf.strip(): out.append(buf.strip())
    return [re.sub(r"\s+", " ", i).strip() for i in out]

def fetch_one(base: str, barcode: str, deadline_ts: float):
    # If we’re already out of time, bail early
    if time.monotonic() >= deadline_ts:
        return None
    try:
        r = requests.get(
            f"{base}/api/v2/product/{barcode}.json",
            params={"fields": FIELDS},
            headers=UA,
            timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
        )
        if not r.ok:
            return None
        j = r.json()
        if j.get("status") == 1:
            return j["product"]
        return None
    except requests.RequestException:
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python fast_lookup.py <BARCODE>")
        sys.exit(1)

    barcode = sys.argv[1].strip()
    start = time.monotonic()
    deadline = start + GLOBAL_DEADLINE

    if not ean13_hint(barcode):
        print(f"⚠️ '{barcode}' may not be EAN-13. Proceeding…")

    print(f"🔎 Looking up {barcode} (≤ {GLOBAL_DEADLINE}s)…")

    product = None
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(OFF_BASES)) as ex:
        futures = [ex.submit(fetch_one, base, barcode, deadline) for base in OFF_BASES]
        for fut in concurrent.futures.as_completed(futures, timeout=GLOBAL_DEADLINE):
            try:
                res = fut.result(timeout=max(0.0, deadline - time.monotonic()))
                if res:
                    product = res
                    # Cancel remaining futures to save time
                    for f in futures:
                        f.cancel()
                    break
            except Exception:
                pass  # ignore timeouts/cancellations

    elapsed = time.monotonic() - start
    if not product:
        print(f"❌ Product not found (or too slow). Took {elapsed:.2f}s.")
        sys.exit(0)

    name   = product.get("product_name") or "-"
    brand  = product.get("brands") or "-"
    cntrs  = product.get("countries") or "-"
    raw_tx = (product.get("ingredients_text") or "").strip()
    struct = product.get("ingredients") if isinstance(product.get("ingredients"), list) else None

    print("✅ Product found")
    print("Name      :", name)
    print("Brand     :", brand)
    print("Countries :", cntrs)

    if raw_tx:
        parsed = split_ingredients(raw_tx)
        print("\nIngredients (parsed from raw text):")
        for i, x in enumerate(parsed, 1):
            print(f"{i}. {x}")
    elif struct:
        print("\nIngredients (from OFF structured list):")
        for i, ing in enumerate([x.get("text") for x in struct if x.get("text")], 1):
            print(f"{i}. {ing}")
    else:
        print("\n⚠️ No ingredients available in OFF for this barcode.")

    print(f"\n⏱️ Done in {elapsed:.2f}s")

if __name__ == "__main__":
    main()
