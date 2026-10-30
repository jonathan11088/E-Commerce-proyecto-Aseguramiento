import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cart } from '../../shared/Interface';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly apiUrl = environment.apiUrl;
  private cartSubject = new BehaviorSubject<Cart>({ items: [], total: 0 });
  cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {}

  get itemCount(): number {
    return this.cartSubject.value.items.reduce(
      (sum, item) => sum + item.quantity, 0
    );
  }

  loadCart(): Observable<Cart> {
    return this.http.get<Cart>(
      `${this.apiUrl}/cart`, { withCredentials: true }
    ).pipe(tap(cart => this.cartSubject.next(cart)));
  }

  addToCart(productId: number, quantity = 1): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/cart/add`,
      { productId, quantity },
      { withCredentials: true }
    ).pipe(tap(() => this.loadCart().subscribe()));
  }

  updateItem(productId: number, quantity: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/cart/update`,
      { productId, quantity },
      { withCredentials: true }
    ).pipe(tap(() => this.loadCart().subscribe()));
  }

  removeItem(productId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/cart/remove/${productId}`,
      { withCredentials: true }
    ).pipe(tap(() => this.loadCart().subscribe()));
  }

  clearCart(): void {
    this.cartSubject.next({ items: [], total: 0 });
  }
}
