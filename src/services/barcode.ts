/**
 * 바코드 보조 매칭 서비스 (Open Food Facts).
 *
 * 바코드가 보이는 와인이면 Open Food Facts 공개 API(키 불필요)로 제품명/생산자
 * 정도를 보강한다(DESIGN.md §2). 커버리지가 들쭉날쭉하므로 어디까지나 보조 수단.
 */

export interface BarcodeProduct {
  name: string | null;
  brand: string | null;
  country: string | null;
}

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';

export interface BarcodeService {
  lookup(barcode: string): Promise<BarcodeProduct | null>;
}

/**
 * Open Food Facts 실 구현. 키가 필요 없어 바로 동작한다.
 * 매칭 실패/네트워크 오류 시 null을 반환해 호출부가 폴백하도록 한다.
 */
export const barcodeService: BarcodeService = {
  async lookup(barcode: string): Promise<BarcodeProduct | null> {
    try {
      const res = await fetch(`${OFF_ENDPOINT}/${encodeURIComponent(barcode)}.json?fields=product_name,brands,countries`);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        status?: number;
        product?: { product_name?: string; brands?: string; countries?: string };
      };
      if (data.status !== 1 || !data.product) return null;
      return {
        name: data.product.product_name ?? null,
        brand: data.product.brands ?? null,
        country: data.product.countries ?? null,
      };
    } catch {
      return null;
    }
  },
};
