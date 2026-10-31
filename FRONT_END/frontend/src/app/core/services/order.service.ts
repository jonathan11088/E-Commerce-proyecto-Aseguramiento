import { Injectable } from '@angular/core';
import { Order } from '../../shared/Interface';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly apiUrl = environment.apiUrl;

  /**
   * Holds the most recently placed order in memory.
   * The confirmation page reads from this instead of re-fetching.
   * Cleared after the user navigates away from the confirmation page.
   *
   * Why BehaviorSubject and not a plain variable?
   * The confirmation component subscribes before the checkout
   * component sets the value — BehaviorSubject replays the current
   * value immediately to any new subscriber.
   */
  private lastOrderSubject = new BehaviorSubject<Order | null>(null);
  lastOrder$ = this.lastOrderSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ── Customer endpoints ────────────────────────────────────────────────────

  /**
   * Places an order for the current user's cart.
   * The backend creates the order atomically inside a transaction:
   * validates stock → creates Order → creates OrderItems with
   * priceAtPurchase snapshot → decrements stock → clears cart.
   */
  checkout(paymentMethod: string): Observable<{ message: string; order: Order }> {
    return this.http.post<{ message: string; order: Order }>(
      `${this.apiUrl}/order/checkout`,
      { paymentMethod },
      { withCredentials: true },
    ).pipe(
      // Store the returned order for the confirmation page
      tap(res => this.lastOrderSubject.next(res.order))
    );
  }

  /**
   * Returns all orders for the currently logged-in customer.
   * Each order includes its items and the priceAtPurchase snapshot.
   */
  getMyOrders(): Observable<{ orders: Order[] }> {
    return this.http.get<{ orders: Order[] }>(
      `${this.apiUrl}/order`,
      { withCredentials: true },
    );
  }

  /**
   * Returns a single order by ID.
   * The backend validates the order belongs to the requesting user.
   */
  getOrderById(id: number): Observable<{ order: Order }> {
    return this.http.get<{ order: Order }>(
      `${this.apiUrl}/order/${id}`,
      { withCredentials: true },
    );
  }

  // ── State management ──────────────────────────────────────────────────────

  /**
   * Clears the in-memory last order.
   * Called when the user navigates away from the confirmation page
   * so that direct URL access to /cart/confirmation redirects
   * to /orders instead of showing a blank page.
   */
  clearLastOrder(): void {
    this.lastOrderSubject.next(null);
  }

  /**
   * Synchronous getter for the current last order value.
   * Useful in guards or components that need the value without subscribing.
   */
  get lastOrder(): Order | null {
    return this.lastOrderSubject.value;
  }
}
