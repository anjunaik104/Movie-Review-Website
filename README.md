# 🎬 CineVerse — Movie Review & Rating Platform

A modern, responsive, and full-featured platform where users can **browse curated movies**, **submit detailed reviews**, and **give ratings** with real-time score calculation, trailer previews, spoiler protection, and personal watchlists.

---

## 🌟 Key Features

### 1. 🍿 Browse & Discover Movies
- **Curated Catalog**: Pre-seeded with 16+ blockbuster and award-winning films across Sci-Fi, Drama, Animation, Action, Crime, Romance, and Horror.
- **Hero Spotlight Carousel**: Dynamic spotlight with auto-cycling backdrop banners, famous quotes, trailer previews, and direct access to reviews.
- **Live Search**: Instant keyword filtering by title, director, cast members, and genres (press `/` to focus anywhere).
- **Genre Filter & Multi-Sort**: Filter by genres (All, Sci-Fi, Drama, Action, Thriller, etc.), sort by Popularity, Highest Rated, Most Reviewed, Newest Release, or Title (A-Z).
- **Rating Cutoffs**: Filter for movies rated ★ 7.0+, 8.0+, or 8.5+.

### 2. ⭐ Rating & Review System
- **Interactive 10-Star Rating Picker**: Smooth hover animations, glow effects, and score sentiment feedback (e.g., *10/10 — Masterpiece!*, *8/10 — Great*, *5/10 — Mediocre*).
- **Review Submission**:
  - Review headline & in-depth body text.
  - "Would you recommend this movie?" Thumbs up / Thumbs down toggle.
  - **Spoiler Protection**: "Contains Spoilers" toggle that automatically blurs review content for other users until they click to reveal.
  - **Confetti Celebration**: Celebratory particle animations when submitting a review.
- **Dynamic Rating Recalculation**: The platform automatically blends community reviews with baseline critic scores, updating average ratings and histograms instantly.
- **Rating Breakdown Histogram**: Visual 5-star distribution bar chart displaying community consensus.
- **Helpful Upvotes**: Community members can vote reviews as helpful (`👍 Helpful (142)`).

### 3. 🔖 Personal Watchlists & Favorites
- Bookmark movies to **My Watchlist** with a single click.
- Heart all-time classics into **My Favorites**.
- Dedicated tabs with badge counters in the navigation bar.
- Fully persisted in `localStorage`.

### 4. 🎭 User Persona Switcher
- Quickly toggle between review personas (*Alex Carter*, *Sophia Chen*, *Marcus Vance*, *Elena Rostova*) or create a custom reviewer name to test diverse review perspectives and author-specific review deletion.

### 5. ➕ Add Custom Movies
- Expand the CineVerse catalog anytime by adding new titles with custom or preset artwork, YouTube trailer links, release year, runtime, and cast.

### 6. 🎥 Trailer Player Modal
- Watch official high-definition YouTube trailers directly within the platform.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
From the project root:
```bash
# 1. Install server dependencies
cd server && npm install

# 2. Install client dependencies
cd ../client && npm install
```

### Running the Application

#### Option A: Run the unified production server (Recommended)
```bash
# Build the client and start Express server on port 5000
npm run build
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser!

#### Option B: Run in Development Mode (with Vite HMR)
```bash
# Start both backend (port 5000) and frontend (port 5173) concurrently:
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti, Vite.
- **Backend**: Node.js, Express 4, CORS.
- **Storage**: Persistent JSON database with atomic file writes in `server/data/`.

### REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/movies` | Fetch all movies with optional `search`, `genre`, `sort`, `minRating` |
| `GET` | `/api/movies/:id` | Fetch movie details with cast, trailer, and community reviews |
| `POST` | `/api/movies` | Add a new movie to the platform catalog |
| `POST` | `/api/movies/:id/reviews` | Submit a review and rating for a movie |
| `POST` | `/api/reviews/:id/vote` | Toggle a helpful upvote on a review |
| `DELETE`| `/api/reviews/:id` | Delete a review (authorized for author) |
| `GET` | `/api/stats` | Platform statistics (total movies, reviews, genres, average score) |

---

## 📂 Project Directory Structure

```
MovieReviewWebsite/
├── package.json               # Root scripts
├── dev-runner.js              # Fullstack dev launcher
├── README.md                  # Documentation
├── server/
│   ├── server.js              # Express REST API & static file server
│   ├── storage.js             # Data access layer & rating algorithms
│   ├── package.json           # Server dependencies (express, cors)
│   └── data/
│       ├── movies.json        # Curated movies database
│       └── reviews.json       # User reviews & helpful votes
└── client/
    ├── package.json           # Client dependencies
    ├── vite.config.ts         # Vite configuration & API proxy
    ├── index.html             # HTML entry point with Outfit & Plus Jakarta fonts
    └── src/
        ├── App.tsx            # Main application layout & state
        ├── main.tsx           # React root mounting
        ├── types.ts           # TypeScript interfaces
        ├── constants/
        │   └── users.ts       # Reviewer personas & genre themes
        ├── services/
        │   └── api.ts         # Backend API client
        └── components/
            ├── Navbar.tsx             # Navigation, search, persona switcher
            ├── HeroSpotlight.tsx      # Carousel banner with trailer button
            ├── FilterBar.tsx          # Genre pills & sort dropdowns
            ├── MovieCard.tsx          # Movie poster, rating, watchlist toggle
            ├── MovieDetailModal.tsx   # Detailed info, review form, community list
            ├── StarRatingWidget.tsx   # Interactive 10-star rating selector
            ├── RatingHistogram.tsx    # 5-star distribution chart
            ├── AddMovieModal.tsx      # Add new movie dialog
            ├── TrailerModal.tsx       # Embedded YouTube player modal
            └── Toast.tsx              # Toast alert notifications
```
