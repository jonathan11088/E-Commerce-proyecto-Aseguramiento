import { inject, Injectable } from '@angular/core';
import { Customer, Order, Product } from '../../shared/Interface';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  private http = inject(HttpClient);

  // ── Products ──────────────────────────────────────────────────────────────

  getAllProducts(): Observable<{ products: Product[] }> {
    return this.http.get<{ products: Product[] }>(
      `${this.apiUrl}/products`, { withCredentials: true }
    );
  }

  createProduct(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/products`, formData, { withCredentials: true }
    );
  }

  updateProduct(id: number, formData: FormData): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/products/${id}`, formData, { withCredentials: true }
    );
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/products/${id}`, { withCredentials: true }
    );
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  getAllCustomers(): Observable<{ customers: Customer[] }> {
    return this.http.get<{ customers: Customer[] }>(
      `${this.apiUrl}/customers`, { withCredentials: true }
    );
  }

  toggleLock(id: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/customers/${id}/lock`, {}, { withCredentials: true }
    );
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  getAllOrders(): Observable<{ orders: Order[] }> {
    return this.http.get<{ orders: Order[] }>(
      `${this.apiUrl}/orders`, { withCredentials: true }
    );
  }

  getOrderDetail(id: number): Observable<{ order: Order }> {
    return this.http.get<{ order: Order }>(
      `${this.apiUrl}/orders/${id}`, { withCredentials: true }
    );
  }

  // ── Taxonomy (for product form dropdowns) ─────────────────────────────────

  getTaxonomy() {
    return this.http.get<any>(
      `${environment.apiUrl}/products/taxonomy`, { withCredentials: true }
    );
  }

  getOrderById(id: string) {
    // Make sure this URL is protected by your Admin middleware on the backend
    return this.http.get(`${this.apiUrl}/orders/${id}`, { withCredentials: true });
  }
}
