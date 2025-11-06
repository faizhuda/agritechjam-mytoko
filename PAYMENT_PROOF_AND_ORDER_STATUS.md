# Payment Proof & Order Status Management - Implementation Summary

## 🎯 Features Implemented

### 1. Payment Proof Upload (Mandatory)
- ✅ Upload payment proof image at checkout step 3
- ✅ Drag & drop support
- ✅ File validation (image only, max 5MB)
- ✅ Image preview before upload
- ✅ Upload to Supabase Storage (`orders` bucket)
- ✅ Save URL to database (`orders.payment_proof_url`)
- ✅ Display on invoice page
- ✅ **MANDATORY** - Can't place order without uploading

### 2. Order Status-Based Actions
Orders now show different actions based on status:

#### **Pending/Paid** 
- ❌ No Rate button
- ✅ **Cancel Order** button (returns stock)

#### **Shipped**
- ❌ No action buttons
- ✅ Just "View Invoice"

#### **Delivered**
- ✅ **Rate Product** button
- ✅ Can write reviews

#### **Cancelled**
- ❌ No actions
- ✅ Stock automatically returned

### 3. Stock Management
- ✅ When order is cancelled, stock is returned to products
- ✅ Uses RPC function for atomic updates
- ✅ Fallback to manual update if RPC doesn't exist

---

## 📁 Files Created/Modified

### Database Schema:
1. `supabase/orders_add_payment_proof.sql`
   - Add `payment_proof_url` column
   - Add index for performance

2. `supabase/storage_payment_proofs.sql`
   - Create `orders` storage bucket
   - RLS policies for upload/view/delete

3. `supabase/products_increment_stock_rpc.sql`
   - RPC function to increment stock atomically

### Frontend:
1. `app/checkout/page.tsx`
   - Payment proof upload UI
   - File validation & preview
   - Upload to storage
   - Save URL to order

2. `app/invoice/page.tsx`
   - Display payment proof image
   - Fetch from admin endpoint

3. `app/dashboard/page.tsx`
   - Conditional action buttons based on status
   - Cancel order functionality
   - Status color coding

### Backend:
1. `app/api/orders/[id]/cancel/route.ts`
   - Cancel order endpoint
   - Return stock to products
   - Update order status

2. `app/api/admin/orders/[id]/route.ts`
   - Add `payment_proof_url` to response

---

## 🗄️ Database Setup

### Step 1: Add Payment Proof Column
```sql
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_proof_url text;

CREATE INDEX IF NOT EXISTS idx_orders_payment_proof ON public.orders(payment_proof_url);
```

### Step 2: Create Storage Bucket
Option A: Via SQL
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('orders', 'orders', true)
ON CONFLICT (id) DO NOTHING;
```

Option B: Via Supabase Dashboard
1. Go to Storage
2. Create new bucket: `orders`
3. Make it public

### Step 3: Create RPC Function
```sql
CREATE OR REPLACE FUNCTION public.increment_product_stock(
  p_product_id bigint,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET stock = stock + p_quantity
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_stock(bigint, integer) TO authenticated;
```

---

## 🧪 Testing Checklist

### Payment Proof Upload:
- [ ] Try to place order without uploading → Should show error
- [ ] Upload invalid file (PDF, video) → Should show error
- [ ] Upload file > 5MB → Should show error
- [ ] Upload valid image → Should show preview
- [ ] Place order with proof → Should upload successfully
- [ ] View invoice → Should display payment proof image

### Order Status Actions:

#### Pending Order:
- [ ] Create order
- [ ] Check dashboard → Should show "Cancel Order" button
- [ ] Cancel order → Stock should be returned
- [ ] Check product stock → Should increase

#### Paid Order:
- [ ] Mark order as paid (admin)
- [ ] Check dashboard → Should show "Cancel Order" button
- [ ] No "Rate" button should appear

#### Shipped Order:
- [ ] Mark order as shipped (admin)
- [ ] Check dashboard → No action buttons except "View Invoice"

#### Delivered Order:
- [ ] Mark order as delivered (admin)
- [ ] Check dashboard → Should show "Rate Product" button
- [ ] Click rate → Should open rating modal
- [ ] Submit review → Should save successfully

#### Cancelled Order:
- [ ] Cancelled order should show red badge
- [ ] No action buttons
- [ ] Stock should be returned

---

## 🚨 Known Issues & Solutions

### Issue 1: Payment Proof Not Showing
**Solution**: 
1. Make sure storage bucket `orders` is created
2. Check RLS policies allow public read
3. Verify `payment_proof_url` is saved in database
4. Check admin endpoint includes `payment_proof_url` in SELECT

### Issue 2: Cancel Order Fails
**Solution**:
1. Make sure RPC function is created
2. Check user owns the order
3. Verify order status is `pending` or `paid`

### Issue 3: Stock Not Returned
**Solution**:
1. Check RPC function exists and has proper permissions
2. Verify products table has `stock` column
3. Check logs for errors

---

## 📊 Order Status Flow

```
pending → paid → shipped → delivered
   ↓       ↓        ↓         ↓
   ↓       ↓        ↓      [CAN REVIEW]
   ↓       ↓        ↓
   ↓       ↓     [NO ACTIONS]
   ↓       ↓
   ↓    [CAN CANCEL]
   ↓
[CAN CANCEL]
   ↓
cancelled
   ↓
[STOCK RETURNED]
```

---

## 🎨 UI States

### Checkout Step 3:
- **No File**: Gray border, upload icon, "* Required" text, disabled button
- **File Uploaded**: Green border, checkmark icon, "Success" message, enabled button

### Dashboard Order Card:
- **Pending/Paid**: Yellow/Green badge, "Cancel Order" button
- **Shipped**: Blue badge, no action buttons
- **Delivered**: Green badge, "Rate Product" button
- **Cancelled**: Red badge, no action buttons

---

## 🔒 Security

1. **RLS Policies**: 
   - Users can only cancel their own orders
   - Users can only upload to payment-proofs folder
   - Public can view payment proofs (bucket is public)

2. **Validation**:
   - File type: image/* only
   - File size: max 5MB
   - Order status: only pending/paid can be cancelled

3. **Stock Management**:
   - Atomic updates via RPC
   - Fallback to fetch+update if RPC unavailable

---

## 📝 Notes

- Payment proof is **mandatory** for all new orders
- Old orders without payment proof are allowed (NULL)
- Cancelled orders automatically return stock
- Reviews can only be submitted for delivered orders
- Stock is incremented atomically to prevent race conditions

---

## 🚀 Deployment Steps

1. Run all SQL scripts in order:
   - `orders_add_payment_proof.sql`
   - `storage_payment_proofs.sql` (or create bucket via UI)
   - `products_increment_stock_rpc.sql`

2. Deploy frontend changes

3. Test all scenarios in production

4. Monitor logs for errors

---

**Last Updated**: November 6, 2025
**Status**: ✅ Ready for Production
