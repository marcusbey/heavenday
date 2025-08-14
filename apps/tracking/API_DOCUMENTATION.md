# Heaven Dolls Tracking System - API Documentation

This document describes all the webhook endpoints and APIs provided by the Heaven Dolls tracking system.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.com`

## Authentication

All webhook endpoints (except user activity) require signature verification using HMAC-SHA256.

### Signature Generation

```javascript
const crypto = require('crypto');

const payload = JSON.stringify(data);
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

// Include in headers
headers['X-Webhook-Signature'] = `sha256=${signature}`;
```

## Webhook Endpoints

### 1. Health Check

**GET** `/health`

Check system health and status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "heaven-dolls-tracking"
}
```

### 2. Order Webhooks

**POST** `/webhooks/order`

Track order lifecycle events.

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<signature>`

**Request Body:**
```json
{
  "action": "created|updated|shipped|delivered",
  "order": {
    "id": "ORD-123456",
    "customerId": "CUST-789",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "status": "pending|confirmed|processing|shipped|out_for_delivery|delivered|cancelled|refunded",
    "totalAmount": 199.99,
    "currency": "USD",
    "paymentMethod": "credit_card",
    "shippingMethod": "standard",
    "items": [
      {
        "productId": "PROD-001",
        "variantId": "VAR-001",
        "name": "Premium Doll",
        "sku": "PD-001",
        "quantity": 1,
        "price": 199.99,
        "totalPrice": 199.99
      }
    ],
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "address1": "123 Main St",
      "city": "New York",
      "province": "NY",
      "country": "US",
      "postalCode": "10001"
    },
    "billingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "address1": "123 Main St",
      "city": "New York",
      "province": "NY",
      "country": "US",
      "postalCode": "10001"
    },
    "trackingNumber": "1Z123456789",
    "carrier": "UPS",
    "estimatedDelivery": "2024-01-20T00:00:00.000Z",
    "actualDelivery": "2024-01-19T14:30:00.000Z"
  },
  "notes": "Optional notes about the order change"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order webhook processed"
}
```

### 3. Payment Webhooks

**POST** `/webhooks/payment`

Track payment-related events.

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<signature>`

**Request Body:**
```json
{
  "action": "payment_completed|payment_failed|refund_processed",
  "paymentId": "PAY-123456",
  "orderId": "ORD-123456",
  "amount": 199.99,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "transactionId": "TXN-789012",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Shipping Webhooks

**POST** `/webhooks/shipping`

Track shipping and delivery updates.

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<signature>`

**Request Body:**
```json
{
  "orderId": "ORD-123456",
  "trackingNumber": "1Z123456789",
  "carrier": "UPS",
  "status": "in_transit|out_for_delivery|delivered|exception",
  "statusDescription": "Package is out for delivery",
  "location": "New York, NY",
  "timestamp": "2024-01-19T09:00:00.000Z",
  "estimatedDelivery": "2024-01-19T18:00:00.000Z",
  "originalEstimatedDelivery": "2024-01-20T18:00:00.000Z",
  "delayDays": 0,
  "customerName": "John Doe",
  "customerEmail": "john@example.com"
}
```

### 5. User Activity Webhooks

**POST** `/webhooks/user`

Track user interactions and behavior (no signature required).

**Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "userId": "USER-123",
  "sessionId": "SESSION-456",
  "type": "page_view|product_view|category_view|search|add_to_cart|remove_from_cart|checkout_started|purchase|sign_up|sign_in",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "page": "/products/luxury-collection",
  "productId": "PROD-001",
  "categoryId": "CAT-001",
  "searchQuery": "luxury dolls",
  "referrer": "https://google.com",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "ipAddress": "192.168.1.1",
    "value": 199.99,
    "currency": "USD",
    "orderId": "ORD-123456"
  }
}
```

**Examples:**

**Page View:**
```json
{
  "userId": "USER-123",
  "sessionId": "SESSION-456",
  "type": "page_view",
  "page": "/products/luxury-collection",
  "referrer": "https://google.com",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Product View:**
```json
{
  "userId": "USER-123",
  "sessionId": "SESSION-456",
  "type": "product_view",
  "productId": "PROD-001",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Add to Cart:**
```json
{
  "userId": "USER-123",
  "sessionId": "SESSION-456",
  "type": "add_to_cart",
  "productId": "PROD-001",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "quantity": 1,
    "price": 199.99
  }
}
```

**Purchase:**
```json
{
  "userId": "USER-123",
  "sessionId": "SESSION-456",
  "type": "purchase",
  "orderId": "ORD-123456",
  "value": 199.99,
  "currency": "USD",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 6. Support Webhooks

**POST** `/webhooks/support`

Track customer support interactions.

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<signature>`

**Request Body:**
```json
{
  "action": "ticket_created|ticket_updated|satisfaction_score",
  "ticketId": "TICK-123456",
  "ticket": {
    "customerId": "CUST-789",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "subject": "Order delivery issue",
    "description": "My order hasn't arrived yet",
    "category": "order|shipping|payment|product|return|account|technical|general",
    "priority": "low|medium|high|urgent",
    "orderId": "ORD-123456",
    "tags": ["delivery", "urgent"]
  },
  "status": "open|in_progress|waiting_customer|resolved|closed",
  "updatedBy": "agent@heaven-dolls.com",
  "assignedTo": "support-agent@heaven-dolls.com",
  "message": "Ticket status updated",
  "score": 5,
  "feedback": "Great support!"
}
```

### 7. Inventory Webhooks

**POST** `/webhooks/inventory`

Track inventory changes and alerts.

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<signature>`

**Request Body:**
```json
{
  "action": "stock_movement|product_updated|low_stock_alert",
  "productId": "PROD-001",
  "sku": "PD-001",
  "productName": "Premium Doll",
  "movementType": "purchase|sale|adjustment|return|restock",
  "quantity": 5,
  "reason": "Customer purchase",
  "orderId": "ORD-123456",
  "movedBy": "system",
  "costImpact": 25.00,
  "notes": "Automatic stock deduction",
  "product": {
    "id": "PROD-001",
    "name": "Premium Doll",
    "sku": "PD-001",
    "category": "Luxury",
    "currentStock": 15,
    "lowStockThreshold": 10,
    "reorderPoint": 5,
    "reorderQuantity": 50,
    "costPrice": 50.00,
    "sellingPrice": 199.99
  },
  "currentStock": 15,
  "threshold": 10,
  "estimatedStockoutDate": "2024-02-01T00:00:00.000Z"
}
```

### 8. Strapi Webhooks

#### Order Webhook

**POST** `/webhooks/strapi/order`

Receive order updates from Strapi CMS.

**Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "event": "entry.create|entry.update|entry.delete",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "model": "order",
  "entry": {
    "id": 1,
    "attributes": {
      "orderId": "ORD-123456",
      "customer": {
        "data": {
          "id": 1,
          "attributes": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com"
          }
        }
      },
      "status": "pending",
      "totalAmount": 199.99,
      "currency": "USD",
      "items": {
        "data": [
          {
            "id": 1,
            "attributes": {
              "product": {
                "data": {
                  "id": 1,
                  "attributes": {
                    "name": "Premium Doll",
                    "sku": "PD-001"
                  }
                }
              },
              "quantity": 1,
              "price": 199.99
            }
          }
        ]
      }
    }
  }
}
```

#### Product Webhook

**POST** `/webhooks/strapi/product`

Receive product updates from Strapi CMS.

**Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "event": "entry.create|entry.update|entry.delete",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "model": "product",
  "entry": {
    "id": 1,
    "attributes": {
      "name": "Premium Doll",
      "sku": "PD-001",
      "price": 199.99,
      "inventory": 25,
      "lowStockThreshold": 10,
      "category": {
        "data": {
          "attributes": {
            "name": "Luxury"
          }
        }
      },
      "brand": {
        "data": {
          "attributes": {
            "name": "Heaven Dolls Premium"
          }
        }
      }
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request - Invalid data format
- `401`: Unauthorized - Invalid or missing signature
- `404`: Not Found - Invalid endpoint
- `500`: Internal Server Error - System error

## Rate Limiting

The API implements basic rate limiting:
- **Limit**: 1000 requests per hour per IP
- **Headers**: Rate limit info in response headers
- **Exceeded**: HTTP 429 status code

## Webhook Security

### Signature Verification

All signed webhooks use HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Best Practices

1. **Always verify signatures** for authenticated endpoints
2. **Use HTTPS** in production
3. **Implement idempotency** for critical webhooks
4. **Set reasonable timeouts** (30 seconds recommended)
5. **Handle retries** gracefully
6. **Log all webhook attempts** for debugging

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');
const crypto = require('crypto');

class HeavenDollsTracker {
  constructor(baseUrl, secret) {
    this.baseUrl = baseUrl;
    this.secret = secret;
  }

  generateSignature(payload) {
    return crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
  }

  async trackOrder(orderData) {
    const payload = JSON.stringify(orderData);
    const signature = this.generateSignature(payload);

    return axios.post(`${this.baseUrl}/webhooks/order`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`
      }
    });
  }

  async trackUserActivity(activityData) {
    return axios.post(`${this.baseUrl}/webhooks/user`, activityData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Usage
const tracker = new HeavenDollsTracker('http://localhost:3001', 'your-secret');

// Track order
await tracker.trackOrder({
  action: 'created',
  order: {
    id: 'ORD-123456',
    // ... order data
  }
});

// Track user activity
await tracker.trackUserActivity({
  userId: 'USER-123',
  sessionId: 'SESSION-456',
  type: 'page_view',
  page: '/products/luxury-collection',
  timestamp: new Date().toISOString()
});
```

### Python

```python
import requests
import hashlib
import hmac
import json
from datetime import datetime

class HeavenDollsTracker:
    def __init__(self, base_url, secret):
        self.base_url = base_url
        self.secret = secret.encode('utf-8')
    
    def generate_signature(self, payload):
        return hmac.new(
            self.secret,
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def track_order(self, order_data):
        payload = json.dumps(order_data)
        signature = self.generate_signature(payload)
        
        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': f'sha256={signature}'
        }
        
        return requests.post(
            f'{self.base_url}/webhooks/order',
            data=payload,
            headers=headers
        )
    
    def track_user_activity(self, activity_data):
        return requests.post(
            f'{self.base_url}/webhooks/user',
            json=activity_data
        )

# Usage
tracker = HeavenDollsTracker('http://localhost:3001', 'your-secret')

# Track user activity
tracker.track_user_activity({
    'userId': 'USER-123',
    'sessionId': 'SESSION-456',
    'type': 'page_view',
    'page': '/products/luxury-collection',
    'timestamp': datetime.utcnow().isoformat() + 'Z'
})
```

### PHP

```php
<?php

class HeavenDollsTracker {
    private $baseUrl;
    private $secret;
    
    public function __construct($baseUrl, $secret) {
        $this->baseUrl = $baseUrl;
        $this->secret = $secret;
    }
    
    private function generateSignature($payload) {
        return hash_hmac('sha256', $payload, $this->secret);
    }
    
    public function trackOrder($orderData) {
        $payload = json_encode($orderData);
        $signature = $this->generateSignature($payload);
        
        $options = [
            'http' => [
                'header' => [
                    'Content-Type: application/json',
                    'X-Webhook-Signature: sha256=' . $signature
                ],
                'method' => 'POST',
                'content' => $payload
            ]
        ];
        
        $context = stream_context_create($options);
        return file_get_contents($this->baseUrl . '/webhooks/order', false, $context);
    }
    
    public function trackUserActivity($activityData) {
        $options = [
            'http' => [
                'header' => 'Content-Type: application/json',
                'method' => 'POST',
                'content' => json_encode($activityData)
            ]
        ];
        
        $context = stream_context_create($options);
        return file_get_contents($this->baseUrl . '/webhooks/user', false, $context);
    }
}

// Usage
$tracker = new HeavenDollsTracker('http://localhost:3001', 'your-secret');

$tracker->trackUserActivity([
    'userId' => 'USER-123',
    'sessionId' => 'SESSION-456',
    'type' => 'page_view',
    'page' => '/products/luxury-collection',
    'timestamp' => gmdate('c')
]);
?>
```

## Testing

### Webhook Testing Tool

Use a tool like ngrok for local testing:

```bash
# Install ngrok
npm install -g ngrok

# Start your local server
npm run webhook:start

# In another terminal, expose it
ngrok http 3001

# Use the ngrok URL for webhook testing
# Example: https://abc123.ngrok.io/webhooks/order
```

### Test Webhooks

```bash
# Test order webhook
curl -X POST http://localhost:3001/webhooks/order \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=YOUR_SIGNATURE" \
  -d '{"action":"created","order":{"id":"TEST-001"}}'

# Test user activity
curl -X POST http://localhost:3001/webhooks/user \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER-123","sessionId":"SESSION-456","type":"page_view","timestamp":"2024-01-15T10:30:00.000Z"}'
```

## Support

For API questions and support:
- Check the logs: `tail -f logs/combined.log`
- Review error responses for details
- Test with the `/health` endpoint first
- Verify your webhook signatures are correct