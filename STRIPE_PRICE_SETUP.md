# 🔧 How to Get Your Stripe Price IDs

## ⚠️ CRITICAL: Price IDs vs Product IDs

**YOU MUST USE PRICE IDs, NOT PRODUCT IDs!**

- ✅ **Price ID**: Starts with `price_` (e.g., `price_1SVJx43u7C5H6bgw1234567`)
- ❌ **Product ID**: Starts with `prod_` (e.g., `prod_ThTFea4ZalA0F4`)

**Using a Product ID instead of a Price ID will cause the error:**
```
StripeInvalidRequestError: No such price: 'prod_ThTFea4ZalA0F4'
```

---

## The Issue

Your `.env` file currently has PLACEHOLDER Price IDs:
```env
STRIPE_PRO_PRICE_ID=price_REPLACE_WITH_YOUR_ACTUAL_PRO_PRICE_ID
STRIPE_BUSINESS_PRICE_ID=price_REPLACE_WITH_YOUR_ACTUAL_BUSINESS_PRICE_ID
```

**These are NOT real Price IDs** - you need to create actual products and prices in your Stripe account.

---

## ✅ Step-by-Step Setup

### Step 1: Create Stripe Products

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/products
2. **Click "Add Product"**

#### Create Pro Plan Product:

- **Name**: `Pro Plan`
- **Description**: `Unlimited AI resumes, 20+ premium templates, priority support`
- **Pricing**:
  - Model: `Recurring`
  - Price: `$12.00 USD`
  - Billing period: `Monthly`
- **Click "Add Product"**

#### Create Business Plan Product:

- **Name**: `Business Plan`
- **Description**: `Everything in Pro + Team management + API access + Custom branding`
- **Pricing**:
  - Model: `Recurring`
  - Price: `$49.00 USD`
  - Billing period: `Monthly`
- **Click "Add Product"**

---

### Step 2: Copy Price IDs

After creating each product, you'll see a **Price ID** that looks like:

```
price_1SVJx43u7C5H6bgw1234567
```

**IMPORTANT: How to find the Price ID (NOT Product ID):**

1. Go to https://dashboard.stripe.com/test/products
2. Click on your **Pro Plan** product
3. In the product details page, look for the **"Pricing"** section
4. You'll see something like:
   ```
   Price: $12.00 USD / month
   Price ID: price_1SVJx43u7C5H6bgw1234567  ← COPY THIS!
   Product ID: prod_ThTFea4ZalA0F4  ← DON'T USE THIS!
   ```
5. **Copy the Price ID** (starts with `price_`)
6. **DO NOT copy the Product ID** (starts with `prod_`)

Repeat for the **Business Plan**.

**Common Mistake:**
- ❌ Copying the Product ID from the top of the page
- ✅ Copying the Price ID from the Pricing section

---

### Step 3: Update `.env` File

Open `c:\Resume Builder\backend\.env` and replace the placeholders:

```env
# Replace these with your ACTUAL Price IDs from Stripe Dashboard
STRIPE_PRO_PRICE_ID=price_1SVJx43u7C5H6bgw1234567
STRIPE_BUSINESS_PRICE_ID=price_1SVKy54u8C6H7chx7654321
```

---

### Step 4: Verify Configuration

Restart your backend server:

```powershell
cd "c:\Resume Builder\backend"
npm run dev
```

You should see:

```
✅ Stripe configuration validated
   • Secret Key: sk_test_51Sk3Q3...
   • Webhook Secret: whsec_FZ848mZ...
   • Pro Price ID: price_1SVJx43u7C5H6bgw1234567
   • Business Price ID: price_1SVKy54u8C6H7chx7654321
```

---

## 🧪 Quick Test

1. Start the backend server
2. Open frontend: http://localhost:8080
3. Sign in with Google
4. Go to **Dashboard** or **Pricing** page
5. Click **"Go Pro"** or **"Business"** button
6. Watch the browser console and backend logs

### ✅ Expected Logs (Success):

**Backend:**
```
🔵 Creating checkout session...
Request body: { planType: 'pro' }
User: { id: '...', email: 'user@example.com' }
✅ Plan validated: pro { priceId: 'price_1SVJx43...', amount: 1200 }
✅ User found: user@example.com
✅ Using existing Stripe customer: cus_...
🔵 Creating Stripe Checkout Session...
✅ Checkout session created successfully!
   Session ID: cs_test_...
   Session URL: https://checkout.stripe.com/c/pay/cs_test_...
```

**Frontend:**
- Should redirect to Stripe Checkout page

### ❌ Common Errors:

#### Error: "No such price"

**Cause**: Wrong Price ID or not created in Stripe

**Fix**:
1. Double-check Price ID in `.env`
2. Verify product exists in Stripe Dashboard
3. Make sure you're using **test mode** Price IDs with **test API keys**

#### Error: "Stripe Price ID not configured"

**Cause**: Price ID is still the placeholder value

**Fix**: Follow Steps 1-3 above to get real Price IDs

---

## 📸 Visual Guide

### Finding Price IDs in Stripe Dashboard:

1. **Navigate to Products**: https://dashboard.stripe.com/test/products
2. **Click on a product** (e.g., "Pro Plan")
3. **Look for "Pricing"** section
4. **Copy the Price ID** (looks like `price_1SV...`)

---

## 🚨 Important Notes

### Test vs Production Mode

- **Test Mode** (for development):
  - Price IDs start with `price_`
  - Use test API keys (start with `sk_test_`)
  - Use test cards (e.g., `4242 4242 4242 4242`)

- **Production Mode** (for live site):
  - Price IDs start with `price_`
  - Use live API keys (start with `sk_live_`)
  - Real credit cards are charged

**Make sure your API keys and Price IDs match the mode!**

---

## 🔗 Helpful Links

- **Stripe Products**: https://dashboard.stripe.com/test/products
- **API Keys**: https://dashboard.stripe.com/test/apikeys
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Test Cards**: https://stripe.com/docs/testing#cards

---

## ✅ Checklist

- [ ] Created Pro Plan product in Stripe Dashboard
- [ ] Created Business Plan product in Stripe Dashboard
- [ ] Copied Pro Plan Price ID
- [ ] Copied Business Plan Price ID
- [ ] Updated `STRIPE_PRO_PRICE_ID` in `.env`
- [ ] Updated `STRIPE_BUSINESS_PRICE_ID` in `.env`
- [ ] Restarted backend server
- [ ] Saw "✅ Stripe configuration validated" message
- [ ] Tested checkout button and saw Stripe Checkout page

---

## 💬 Need Help?

If you're still seeing errors:

1. **Check backend logs** for detailed error messages
2. **Verify all environment variables** are set correctly
3. **Make sure you're in test mode** in Stripe Dashboard
4. **Restart the backend server** after changing `.env`

The improved error logging will now show you exactly what's wrong! 🎯
