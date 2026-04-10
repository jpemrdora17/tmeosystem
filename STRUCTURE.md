# Traffic Enforcement Management System (TEMS)
# Lucena City - TMEO
# Folder Structure

project/
│
├── index.html                  # Redirects to login.html
├── login.html                  # Login page
├── register.html               # Register page
├── admin.html                  # Admin dashboard
├── staff.html                  # Staff dashboard
├── enforcer.html               # Enforcer dashboard
├── manifest.json               # PWA manifest
├── service-worker.js           # PWA service worker
│
├── css/
│   ├── global.css              # CSS variables, reset, shared styles
│   ├── auth.css                # Login & Register page styles
│   ├── sidebar.css             # Sidebar navigation styles
│   ├── dashboard.css           # Dashboard layout & card styles
│   ├── tables.css              # Table styles
│   ├── modals.css              # Modal/popup styles
│   └── responsive.css          # Mobile responsive overrides
│
├── js/
│   ├── auth.js                 # Login / Register / Logout logic
│   ├── storage.js              # localStorage helpers
│   ├── admin.js                # Admin dashboard logic
│   ├── staff.js                # Staff dashboard logic
│   ├── enforcer.js             # Enforcer dashboard logic
│   ├── violations.js           # Violation CRUD operations
│   ├── receipt.js              # E-Receipt generation & print
│   ├── camera.js               # getUserMedia camera capture
│   ├── gps.js                  # Geolocation / GPS tracking
│   └── utils.js                # Shared utility functions
│
├── pages/
│   ├── admin/
│   │   ├── violation-records.html
│   │   ├── gis-map.html
│   │   ├── gps-tracking.html
│   │   ├── manage-enforcers.html
│   │   ├── manage-violation-types.html
│   │   ├── reports.html
│   │   └── user-management.html
│   ├── staff/
│   │   ├── encode-violation.html
│   │   └── receipts.html
│   └── enforcer/
│       ├── capture.html
│       ├── gps.html
│       └── submit-report.html
│
└── assets/
    ├── logo.png                # TMEO seal/logo
    ├── bg-traffic.jpg          # Traffic light hero background
    └── icons/                  # SVG icons for sidebar
