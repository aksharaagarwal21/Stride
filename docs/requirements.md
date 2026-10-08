# Stride — requirements checklist

Source of truth: `Intern_Task_Full_Stack_Developer.pdf` (Full Stack Developer Task: Project Management System, Web + Mobile).
Status legend: `[x]` implemented and verified, `[~]` implemented but needs a manual or external step, `[ ]` not done.

## 1. Authentication

- [ ] Register (full name, email, password)
- [ ] Login
- [ ] Logout (server-side session revocation)
- [ ] Unique email (normalized: trimmed + lowercased)
- [ ] Passwords hashed with bcrypt, never stored or returned in plain text
- [ ] Stay logged in until logout or token expiration
- [ ] One account works on web and Android

## 2. Projects (web)

- [ ] Create, view details, edit, delete, list owned projects
- [ ] Fields: name, description, status (Not Started / In Progress / Completed), start date, end date, created date

## 3. Tasks

- [ ] Create, edit, delete, mark completed, view tasks under a project
- [ ] Fields: name, description, priority (Low / Medium / High), status (Pending / In Progress / Completed), due date, created date

## 4. Dashboard (per authenticated user)

- [ ] Total Projects
- [ ] Total Tasks
- [ ] Completed Tasks
- [ ] Pending Tasks
- [ ] Projects In Progress

## 5. Search and filtering

- [ ] Search projects by name
- [ ] Search tasks by name
- [ ] Filter projects by status
- [ ] Filter tasks by status
- [ ] Filter tasks by priority

## 6. Mobile app (Android required)

- [ ] Same backend and database; no separate mobile backend
- [ ] Register / login / logout with the same account as web
- [ ] Dashboard
- [ ] All projects and the tasks under each project
- [ ] Create, edit, delete tasks
- [ ] Mark completed; change status and priority
- [ ] Search tasks; filter by status and priority
- [ ] Changes on one platform appear on the other after refresh (pull-to-refresh)
- [ ] Token in secure device storage (Android Keystore via Expo SecureStore)
- [ ] Expired token → back to login with a clear message
- [ ] No network → clear message, no crash or blank screen

## Technical requirements

- [ ] Web: React, responsive, component structure, form validation, loading indicators, error handling
- [ ] Mobile: React Native (Expo), navigation, validation, loading + pull-to-refresh, error handling, secure token storage
- [ ] Backend: Express REST API, route organization, middleware, error handling, logging, CORS for the web origin
- [ ] Database: PostgreSQL, relational design, foreign keys, normalized

## Security

- [ ] bcrypt password hashing
- [ ] Protected APIs require authentication (JWT + auth middleware)
- [ ] Ownership: users only see/modify/delete their own projects and tasks
- [ ] Backend validation of every request (required fields, email format, dates, empty strings, enums)
- [ ] No sensitive data in API responses
- [ ] SQL-injection safety (ORM / parameterized queries only)
- [ ] Rate limiting on authentication endpoints

## Required endpoints

- [ ] `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- [ ] `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/{id}`
- [ ] `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/{id}`
- [ ] `GET /api/dashboard`

## Documentation

- [ ] Setup instructions (backend, web, mobile)
- [ ] Environment variables
- [ ] Database setup
- [ ] API documentation
- [ ] Running the mobile app against the deployed backend

## Submission

- [ ] Public GitHub repository
- [ ] Database schema / ER diagram
- [ ] API documentation
- [ ] README
- [ ] Deployment URL for web and backend
- [ ] Android APK or Expo distribution link
- [ ] 5-minute screen recording (same account on web + mobile, create on one, show on the other)

## Bonus (optional) — targeted

- [ ] Docker support
- [ ] Integration tests
- [ ] Pagination
- [ ] Sorting
- [ ] Shared types/validation across web, mobile, backend
- [ ] CI pipeline
