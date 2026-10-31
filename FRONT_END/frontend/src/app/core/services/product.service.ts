import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Product, ProductQuery, ProductsResponse, TaxonomyType } from '../../shared/Interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly apiUrl = environment.apiUrl;
  private readonly imageBase = environment.imageBaseUrl;

  constructor(private http: HttpClient) { }

  getProducts(query: ProductQuery = {}): Observable<ProductsResponse> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.typeId) params = params.set('typeId', query.typeId);
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    if (query.subCategoryId) params = params.set('subCategoryId', query.subCategoryId);
    if (query.minPrice) params = params.set('minPrice', query.minPrice);
    if (query.maxPrice) params = params.set('maxPrice', query.maxPrice);
    if (query.inStock) params = params.set('inStock', 'true');
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);

    return this.http.get<ProductsResponse>(
      `${this.apiUrl}/products`, { params, withCredentials: true }
    );
  }

  getProductById(id: number): Observable<{ product: Product }> {
    return this.http.get<{ product: Product }>(
      `${this.apiUrl}/products/${id}`
    );
  }

  getTaxonomy(): Observable<{ taxonomy: TaxonomyType[] }> {
    return this.http.get<{ taxonomy: TaxonomyType[] }>(
      `${this.apiUrl}/products/taxonomy`
    );
  }

  /**
   * Resolves the full image URL from a stored filename.
   * Returns the default placeholder if no image exists.
   */
  getImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      return `${environment.imageBaseUrl}/Images/default.png`;
    }

    // ── Already a full URL (Flixcart, Amazon, etc.) — return as-is ──
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // ── Local filename — prepend backend image base URL ──────────────
    return `${environment.imageBaseUrl}/${imagePath}`;
  }
}
