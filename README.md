# BashaLagbe (Flat/Room Rental Marketplace) 🏠

A full-stack real estate marketplace for Bangladesh that simplifies property rentals and sales by connecting landlords and tenants directly.

🚀 **Live Demo:** [bashalagbe-7se3.onrender.com](https://bashalagbe-7se3.onrender.com)
📂 **Repository:** [github.com/mahirTaj/BashaLagbe](https://github.com/mahirTaj/BashaLagbe)

---

## 📖 Overview

BashaLagbe addresses inefficiencies in the Bangladeshi rental market by offering:

* A centralized digital marketplace for properties.
* Direct communication between tenants and landlords.
* Market analytics with rent trend visualization.
* Administrative tools for content moderation and fraud prevention.

---

## ✨ Features

* **User Authentication & Role Management** – Secure login with role-based access (Tenant, Landlord, Admin).
* **Add/Edit Listings** – Landlords can post properties with photos, videos, and amenities.
* **Advanced Search & Filters** – Search by price, location, rooms, and property type.
* **Interactive Map** – Explore listings visually with location-based filtering.
* **Wishlist & Notifications** – Save favorite listings and receive updates.
* **Analytics Dashboard** – Price trends and property insights using visual charts.
* **Admin Tools** – Verify listings, manage users, moderate reports, and process scraped rental data.
* **Comparison Tool** – Compare multiple listings side-by-side.

---

## 🛠️ Tech Stack

**Frontend:** React.js (Hooks, Material-UI, Recharts, Leaflet)
**Backend:** Node.js, Express.js
**Database:** MongoDB with Mongoose ODM
**Authentication:** JWT (JSON Web Tokens)
**File Handling:** Multer for uploads
**Data Processing:** CSV-parser for market data
**Other:** Axios, bcrypt, dotenv

---

## 📸 UI/UX Designs

[Figma Design 1](https://www.figma.com/design/66VnZi1tbYJc9jHy9epj56)
[Figma Design 2](https://www.figma.com/design/ZUerpzYl53jCla8RjbvNtm)

---

## ⚡ Getting Started

### Prerequisites

* Node.js (>= 16)
* MongoDB (local or cloud)

### Installation

```bash
# Clone repo
git clone https://github.com/mahirTaj/BashaLagbe.git
cd BashaLagbe

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env   # then edit your MongoDB URI, JWT secret, etc.

# Run backend
npm run server

# Run frontend
npm start
```

---


## 📚 References

* [React.js Docs](https://reactjs.org/docs/)
* [Material-UI](https://mui.com/)
* [Node.js & Express](https://expressjs.com/)
* [MongoDB Docs](https://docs.mongodb.com/)
* [Recharts](https://recharts.org/en-US/)
* [RESTful API Principles](https://restfulapi.net/)

---


