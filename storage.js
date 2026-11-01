import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOVIES_FILE = path.join(__dirname, 'data', 'movies.json');
const REVIEWS_FILE = path.join(__dirname, 'data', 'reviews.json');

async function readJson(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeJson(filePath, defaultValue);
      return defaultValue;
    }
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

async function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substr(2, 4)}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
}

// Compute dynamic movie rating stats based on reviews
export function calculateMovieStats(movie, movieReviews) {
  if (!movieReviews || movieReviews.length === 0) {
    return {
      averageRating: movie.initialRating || 0,
      totalReviews: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      recommendationPercentage: 100
    };
  }

  // Convert 10-point scale ratings to 5-star buckets for histogram
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let recommendedCount = 0;

  for (const r of movieReviews) {
    const rScore = Number(r.rating) || 8;
    sum += rScore;
    if (r.recommended) recommendedCount++;
    const starBucket = Math.max(1, Math.min(5, Math.ceil(rScore / 2)));
    breakdown[starBucket] = (breakdown[starBucket] || 0) + 1;
  }

  // Blend user reviews with initial baseline rating
  const userAvg = sum / movieReviews.length;
  const blendWeight = Math.min(5, movieReviews.length);
  const blendedScore = movie.initialRating
    ? Number((((movie.initialRating * 3) + (userAvg * blendWeight)) / (3 + blendWeight)).toFixed(1))
    : Number(userAvg.toFixed(1));

  const recPct = Math.round((recommendedCount / movieReviews.length) * 100);

  return {
    averageRating: blendedScore,
    userAverageRating: Number(userAvg.toFixed(1)),
    totalReviews: movieReviews.length,
    ratingBreakdown: breakdown,
    recommendationPercentage: recPct
  };
}

export async function getAllMovies({ search = '', genre = '', sort = 'popular', minRating = 0 } = {}) {
  const [movies, reviews] = await Promise.all([
    readJson(MOVIES_FILE, []),
    readJson(REVIEWS_FILE, [])
  ]);

  // Group reviews by movieId
  const reviewsByMovie = {};
  for (const rev of reviews) {
    if (!reviewsByMovie[rev.movieId]) {
      reviewsByMovie[rev.movieId] = [];
    }
    reviewsByMovie[rev.movieId].push(rev);
  }

  // Attach dynamic stats to each movie
  let enriched = movies.map(movie => {
    const movieRevs = reviewsByMovie[movie.id] || [];
    const stats = calculateMovieStats(movie, movieRevs);
    return {
      ...movie,
      stats,
      reviewCount: movieRevs.length,
      rating: stats.averageRating
    };
  });

  // Filter by search
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    enriched = enriched.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.director.toLowerCase().includes(q) ||
      m.genres.some(g => g.toLowerCase().includes(q)) ||
      m.cast?.some(c => c.name.toLowerCase().includes(q))
    );
  }

  // Filter by genre
  if (genre && genre.toLowerCase() !== 'all') {
    enriched = enriched.filter(m =>
      m.genres.some(g => g.toLowerCase() === genre.toLowerCase())
    );
  }

  // Filter by minRating
  if (minRating > 0) {
    enriched = enriched.filter(m => m.rating >= minRating);
  }

  // Sort
  if (sort === 'highest-rated') {
    enriched.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'newest') {
    enriched.sort((a, b) => b.year - a.year || new Date(b.releaseDate) - new Date(a.releaseDate));
  } else if (sort === 'most-reviewed') {
    enriched.sort((a, b) => b.reviewCount - a.reviewCount);
  } else if (sort === 'title') {
    enriched.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // 'popular' / default
    enriched.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.rating * 10 + b.reviewCount * 2) - (a.rating * 10 + a.reviewCount * 2);
    });
  }

  return enriched;
}

export async function getMovieById(id) {
  const [movies, reviews] = await Promise.all([
    readJson(MOVIES_FILE, []),
    readJson(REVIEWS_FILE, [])
  ]);

  const movie = movies.find(m => m.id === id);
  if (!movie) return null;

  const movieReviews = reviews
    .filter(r => r.movieId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const stats = calculateMovieStats(movie, movieReviews);

  return {
    ...movie,
    rating: stats.averageRating,
    stats,
    reviews: movieReviews
  };
}

export async function addMovie(movieData) {
  const movies = await readJson(MOVIES_FILE, []);
  
  // Generate clean id
  const slug = movieData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const id = `${slug}-${movieData.year || new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

  const newMovie = {
    id,
    title: movieData.title.trim(),
    year: Number(movieData.year) || new Date().getFullYear(),
    releaseDate: movieData.releaseDate || `${new Date().getFullYear()}-01-01`,
    runtime: Number(movieData.runtime) || 120,
    genres: Array.isArray(movieData.genres)
      ? movieData.genres
      : (movieData.genres || 'Drama').split(',').map(s => s.trim()).filter(Boolean),
    director: movieData.director?.trim() || 'Unknown Director',
    cast: Array.isArray(movieData.cast) ? movieData.cast : [],
    synopsis: movieData.synopsis?.trim() || 'No synopsis provided.',
    tagline: movieData.tagline?.trim() || '',
    posterUrl: movieData.posterUrl?.trim() || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',
    backdropUrl: movieData.backdropUrl?.trim() || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600',
    trailerYoutubeId: movieData.trailerYoutubeId?.trim() || '',
    mpaaRating: movieData.mpaaRating || 'PG-13',
    initialRating: Number(movieData.initialRating) || 7.5,
    featured: false,
    budget: movieData.budget || 'N/A',
    boxOffice: movieData.boxOffice || 'N/A'
  };

  movies.unshift(newMovie);
  await writeJson(MOVIES_FILE, movies);
  return newMovie;
}

export async function addReview(movieId, reviewData) {
  const [movies, reviews] = await Promise.all([
    readJson(MOVIES_FILE, []),
    readJson(REVIEWS_FILE, [])
  ]);

  const movie = movies.find(m => m.id === movieId);
  if (!movie) {
    throw new Error('Movie not found');
  }

  const ratingNum = Math.max(1, Math.min(10, Number(reviewData.rating) || 8));
  const authorId = reviewData.author?.id || `user-${Date.now()}`;

  const newReview = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    movieId,
    author: {
      id: authorId,
      name: reviewData.author?.name?.trim() || 'Anonymous Cinephile',
      avatar: reviewData.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      badge: reviewData.author?.badge || 'Audience Reviewer'
    },
    rating: ratingNum,
    title: reviewData.title?.trim() || `${ratingNum}/10 Rating`,
    content: reviewData.content?.trim() || `Rated ${ratingNum}/10`,
    containsSpoilers: Boolean(reviewData.containsSpoilers),
    recommended: reviewData.recommended !== undefined ? Boolean(reviewData.recommended) : (ratingNum >= 6),
    createdAt: new Date().toISOString(),
    helpfulVotes: 0,
    votedUserIds: []
  };

  // If this author already reviewed/rated this movie, update existing review
  const existingIdx = reviews.findIndex(r => r.movieId === movieId && r.author?.id === authorId);
  if (existingIdx !== -1) {
    newReview.id = reviews[existingIdx].id;
    newReview.helpfulVotes = reviews[existingIdx].helpfulVotes || 0;
    newReview.votedUserIds = reviews[existingIdx].votedUserIds || [];
    reviews[existingIdx] = newReview;
  } else {
    reviews.unshift(newReview);
  }

  await writeJson(REVIEWS_FILE, reviews);

  // Return review with updated movie stats
  const movieReviews = reviews.filter(r => r.movieId === movieId);
  const stats = calculateMovieStats(movie, movieReviews);

  return {
    review: newReview,
    stats
  };
}

export async function voteReview(reviewId, userId = 'user-current') {
  const reviews = await readJson(REVIEWS_FILE, []);
  const review = reviews.find(r => r.id === reviewId);
  if (!review) throw new Error('Review not found');

  if (!review.votedUserIds) review.votedUserIds = [];
  
  const hasVoted = review.votedUserIds.includes(userId);
  if (hasVoted) {
    review.votedUserIds = review.votedUserIds.filter(id => id !== userId);
    review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
  } else {
    review.votedUserIds.push(userId);
    review.helpfulVotes += 1;
  }

  await writeJson(REVIEWS_FILE, reviews);
  return {
    reviewId,
    helpfulVotes: review.helpfulVotes,
    hasVoted: !hasVoted
  };
}

export async function deleteReview(reviewId) {
  let reviews = await readJson(REVIEWS_FILE, []);
  const initialLen = reviews.length;
  reviews = reviews.filter(r => r.id !== reviewId);
  if (reviews.length === initialLen) return false;
  await writeJson(REVIEWS_FILE, reviews);
  return true;
}

export async function getPlatformStats() {
  const [movies, reviews] = await Promise.all([
    readJson(MOVIES_FILE, []),
    readJson(REVIEWS_FILE, [])
  ]);

  const allGenres = new Set();
  movies.forEach(m => m.genres?.forEach(g => allGenres.add(g)));

  const avgScore = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '8.4';

  return {
    totalMovies: movies.length,
    totalReviews: reviews.length,
    totalGenres: allGenres.size,
    averageRating: avgScore,
    genres: Array.from(allGenres).sort()
  };
}
