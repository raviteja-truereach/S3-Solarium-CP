# API Endpoint Reference Sheet

## Lead Management Endpoints

### Create Lead
**Endpoint:** `POST /api/v1/leads`  
**Authentication:** Bearer token required  
**Description:** Creates a new lead in the system

#### Request Body
```json
{
  "customerName": "John Doe",
  "phone": "9876543210",
  "address": "123 Main Street, Karnataka 560001",
  "services": ["SRV001", "SRV003"]
}
Response (Success - 201)
{
  "success": true,
  "data": {
    "leadId": "LEAD1023"
  }
}
Response (Error - 409 Conflict)
{
  "success": false,
  "error": {
    "code": "DUPLICATE_PHONE",
    "message": "Phone number already exists in the system"
  }
}
Response (Error - 400 Bad Request)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "phone": "Phone number must be exactly 10 digits",
      "customerName": "Customer name is required"
    }
  }
}
Service Management Endpoints
Get Active Services
Endpoint: GET /api/v1/services
Authentication: Bearer token required
Description: Retrieves list of active services for lead creation

Query Parameters
| Parameter | Type | Required | Default | Description | |-----------|------|----------|---------|-------------| | status | string | No | "Active" | Filter by service status | | offset | number | No | 0 | Pagination offset | | limit | number | No | 25 | Number of items per page |

Request Example
GET /api/v1/services?status=Active&offset=0&limit=25
Authorization: Bearer <token>
Response (Success - 200)
{
  "success": true,
  "data": {
    "items": [
      {
        "serviceId": "SRV001",
        "name": "Solar Rooftop Installation",
        "type": "Installation",
        "description": "Complete solar rooftop installation with panels and inverters",
        "status": "Active"
      },
      {
        "serviceId": "SRV002",
        "name": "Battery Storage",
        "type": "Add-on", 
        "description": "Battery backup system for solar installations",
        "status": "Active"
      }
    ],
    "total": 4,
    "offset": 0,
    "limit": 25
  }
}
Customer Management Endpoints
Check Customer by Phone (Internal Use)
Endpoint: GET /api/v1/customers/check-phone
Authentication: Bearer token required
Description: Checks if a phone number already exists in the customer database

Query Parameters
| Parameter | Type | Required | Description | |-----------|------|----------|-------------| | phone | string | Yes | 10-digit phone number to check |

Request Example
GET /api/v1/customers/check-phone?phone=9876543210
Authorization: Bearer <token>
Response (Found - 200)
{
  "success": true,
  "data": {
    "exists": true,
    "customer": {
      "customerId": "CUST-040",
      "name": "Abraham Jacobi",
      "phone": "9876543210"
    }
  }
}
Response (Not Found - 404)
{
  "success": true,
  "data": {
    "exists": false
  }
}
Error Handling
Common Error Codes
| Code | HTTP Status | Description | Resolution | |------|-------------|-------------|------------| | UNAUTHORIZED | 401 | Invalid or expired token | Re-authenticate user | | FORBIDDEN | 403 | Insufficient permissions | Check user role | | VALIDATION_ERROR | 400 | Invalid request data | Fix validation errors | | DUPLICATE_PHONE | 409 | Phone number already exists | Use different phone number | | RATE_LIMIT_EXCEEDED | 429 | Too many requests | Implement retry with backoff | | INTERNAL_ERROR | 500 | Server error | Retry or contact support |

Error Response Format
All error responses follow this consistent format:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details (optional)
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-12345"
}
Rate Limiting
Lead Creation Limits
Rate Limit: 10 requests per minute per user
Burst Limit: 3 requests per 10 seconds
Headers:
X-RateLimit-Limit: Maximum requests per window
X-RateLimit-Remaining: Remaining requests in current window
X-RateLimit-Reset: Time when current window resets
Best Practices
Implement exponential backoff for retries
Cache service data to reduce API calls
Batch operations where possible
Monitor rate limit headers in responses