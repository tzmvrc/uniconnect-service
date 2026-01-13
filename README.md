# Uniconnect – Service

Uniconnect – Service is the **backend service** for the **Uniconnect Forum**, responsible for handling core server-side operations such as API endpoints, data processing, authentication logic, and communication with the database. This service acts as the backbone of the forum, ensuring secure, efficient, and scalable functionality for the frontend application.

## 📌 Project Overview

The Uniconnect Forum is an academic-focused discussion platform designed to help users connect, share knowledge, and engage in meaningful discussions. The backend service manages all business logic and data flow between the frontend and the database.

## 🛠️ Tech Stack

* **Backend:** Node.js / Express.js
* **Database:** MongoDB
* **Authentication:** JWT-based authentication
* **Storage:** Cloud-based storage (e.g., MongoDB Storage / Cloudinary)
* **API Style:** RESTful APIs

## ✨ Key Features

* User authentication and authorization
* Forum post and announcement management
* Commenting and interaction system
* Profile and account management
* Secure API endpoints for frontend consumption

## 📂 Project Structure

```
Uniconnect-Service/
├── controllers/     # Request handling logic
├── routes/          # API route definitions
├── models/          # Database schemas / models
├── middleware/      # Authentication & validation middleware
├── config/          # Environment and database configuration
├── utils/           # Helper functions
└── server.js        # Application entry point
```

## 🚀 Getting Started

### Prerequisites

* Node.js (v16 or later recommended)
* npm or yarn
* Database service credentials (MongoDB / Supabase)

### Installation

```bash
git clone https://github.com/your-username/uniconnect-service.git
cd uniconnect-service
npm install
```

### Environment Setup

Create a `.env` file in the root directory and configure the required variables:

```
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
```

### Running the Server

```bash
npm run dev
# or
npm start
```

The server will run at:

```
http://localhost:5000
```

## 🔌 API Usage

This backend service is consumed by the **Uniconnect Forum frontend**. API endpoints handle user actions such as posting, commenting, authentication, and profile updates.

## 🎓 Purpose

This project was developed as part of an **academic and learning initiative**, focusing on full-stack web development, backend architecture, and API design.

## 📌 Notes

* This repository contains **backend-only code**.
* The frontend is maintained in a separate repository.

## 👤 Author

**Marc Aspa** <br>
**Samantha Paradero**<br>
**Lawrence De Guia**<br>
**Chasie Caduhada**<br>
**Joshua Natino**


---

Feel free to update this README as the project evolves.
