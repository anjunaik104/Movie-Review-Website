import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as storage from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// API Routes

// 1. Get all movies with search, genre, sort, minRating
app.get('/api/movies', async (req, res) => {
  try {
    const { search, genre, sort, minRating } = req.query;
    const movies = await storage.getAllMovies({
      search,
      genre,
      sort,
      minRating: minRating ? parseFloat(minRating) : 0
    });
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// 2. Get movie details by ID
app.get('/api/movies/:id', async (req, res) => {
  try {
    const movie = await storage.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// 3. Add new movie
app.post('/api/movies', async (req, res) => {
  try {
    const { title, director } = req.body;
    if (!title || !director) {
      return res.status(400).json({ error: 'Title and Director are required' });
    }
    const newMovie = await storage.addMovie(req.body);
    res.status(201).json(newMovie);
  } catch (error) {
    console.error('Error adding movie:', error);
    res.status(500).json({ error: 'Failed to add movie' });
  }
});

// 4. Add review and/or rating for a movie (Rating only OR Review+Rating)
app.post('/api/movies/:id/reviews', async (req, res) => {
  try {
    const { rating, content, title } = req.body;
    if (rating === undefined || rating === null) {
      return res.status(400).json({ error: 'Rating (1 to 10 stars) is required' });
    }

    const cleanRating = Math.max(1, Math.min(10, Number(rating) || 8));
    const cleanContent = content && content.trim() ? content.trim() : `Rated ${cleanRating}/10 stars.`;
    const cleanTitle = title && title.trim() ? title.trim() : `${cleanRating}/10 Rating`;

    const reviewPayload = {
      ...req.body,
      rating: cleanRating,
      content: cleanContent,
      title: cleanTitle
    };

    const result = await storage.addReview(req.params.id, reviewPayload);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: error.message || 'Failed to submit review' });
  }
});

// Quick rating endpoint (alias)
app.post('/api/movies/:id/rate', async (req, res) => {
  try {
    const { rating, author } = req.body;
    if (rating === undefined || rating === null) {
      return res.status(400).json({ error: 'Rating (1 to 10) is required' });
    }
    const cleanRating = Math.max(1, Math.min(10, Number(rating) || 8));
    const result = await storage.addReview(req.params.id, {
      rating: cleanRating,
      title: `${cleanRating}/10 Quick Rating`,
      content: `Rated ${cleanRating}/10 stars.`,
      recommended: cleanRating >= 6,
      containsSpoilers: false,
      author: author || { id: 'guest', name: 'Movie Fan' }
    });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error rating movie:', error);
    res.status(500).json({ error: error.message || 'Failed to rate movie' });
  }
});

// 5. Vote helpful on a review
app.post('/api/reviews/:id/vote', async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await storage.voteReview(req.params.id, userId);
    res.json(result);
  } catch (error) {
    console.error('Error voting on review:', error);
    res.status(500).json({ error: error.message || 'Failed to record vote' });
  }
});

// 6. Delete a review
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const success = await storage.deleteReview(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// 7. Get platform statistics and genres
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await storage.getPlatformStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// In production, serve the built client
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('CineVerse Backend API is running. Start the Vite dev server for frontend UI.');
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`🎬 CineVerse API Server running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${PORT} is already in use by another instance. Using existing running server.`);
  } else {
    console.error('Server error:', err);
  }
});
