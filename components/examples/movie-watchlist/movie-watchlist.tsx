"use client";

import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ExternalLink,
  Film,
  Filter,
  Maximize2,
  MessageCircle,
  Minimize2,
  Star,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "../../../lib/ui/cn";
import {
  type Genre,
  GENRE_LABELS,
  type Movie,
  type WatchlistState,
} from "./schema";

type DisplayMode = "inline" | "pip" | "fullscreen";

export interface MovieWatchlistProps {
  movies: Movie[];
  title?: string;
  displayMode: DisplayMode;
  widgetState: WatchlistState;
  theme: "light" | "dark";
  hasModelContext: boolean;
  onWidgetStateChange: (state: Partial<WatchlistState>) => void;
  onRequestDisplayMode: (mode: DisplayMode) => void;
  onRateMovie?: (movieId: string, rating: number) => void;
  onFilterGenre?: (genre: Genre | null) => void;
  onOpenExternal?: (url: string) => void;
  onSendFollowUp?: (message: string) => void;
  onUpdatePreferences?: (genres: Genre[]) => void;
  onLog?: (message: string, data?: Record<string, unknown>) => void;
}

function StarRating({
  rating,
  onRate,
  isDark,
}: {
  rating: number;
  onRate?: (r: number) => void;
  isDark: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate?.(star)}
          className={cn(
            "transition-colors",
            onRate ? "cursor-pointer hover:text-yellow-400" : "cursor-default",
          )}
        >
          <Star
            size={16}
            className={
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : isDark
                  ? "text-zinc-600"
                  : "text-zinc-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

function MovieCard({
  movie,
  isWatched,
  userRating,
  isSelected,
  isDark,
  onToggleWatched,
  onSelect,
  onOpenExternal,
}: {
  movie: Movie;
  isWatched: boolean;
  userRating: number;
  isSelected: boolean;
  isDark: boolean;
  onToggleWatched: () => void;
  onSelect: () => void;
  onOpenExternal?: (url: string) => void;
}) {
  return (
    <div
      className={cn(
        "group rounded-lg border p-3 transition-all cursor-pointer",
        isDark
          ? "border-zinc-700 hover:border-zinc-500"
          : "border-zinc-200 hover:border-zinc-400",
        isSelected &&
          (isDark ? "border-blue-500 bg-blue-950/20" : "border-blue-500 bg-blue-50"),
      )}
      onClick={onSelect}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-2xl",
            isDark ? "bg-zinc-800" : "bg-zinc-100",
          )}
        >
          {movie.posterEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={cn(
                  "truncate font-medium text-sm",
                  isDark ? "text-white" : "text-zinc-900",
                )}
              >
                {movie.title}
              </h3>
              <p
                className={cn(
                  "text-xs",
                  isDark ? "text-zinc-400" : "text-zinc-500",
                )}
              >
                {movie.year} &middot; {movie.director}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWatched();
                }}
                className={cn(
                  "rounded p-1 transition-colors",
                  isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-100",
                )}
                title={isWatched ? "Mark unwatched" : "Mark watched"}
              >
                {isWatched ? (
                  <BookmarkCheck size={16} className="text-green-500" />
                ) : (
                  <Bookmark
                    size={16}
                    className={isDark ? "text-zinc-500" : "text-zinc-400"}
                  />
                )}
              </button>
              {movie.imdbUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenExternal?.(movie.imdbUrl!);
                  }}
                  className={cn(
                    "rounded p-1 transition-colors",
                    isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-100",
                  )}
                  title="Open on IMDB"
                >
                  <ExternalLink
                    size={14}
                    className={isDark ? "text-zinc-500" : "text-zinc-400"}
                  />
                </button>
              )}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                isDark
                  ? "bg-zinc-800 text-zinc-300"
                  : "bg-zinc-100 text-zinc-600",
              )}
            >
              {GENRE_LABELS[movie.genre]}
            </span>
            <div className="flex items-center gap-0.5">
              <Star size={10} className="fill-yellow-400 text-yellow-400" />
              <span
                className={cn(
                  "text-[10px]",
                  isDark ? "text-zinc-400" : "text-zinc-500",
                )}
              >
                {movie.rating.toFixed(1)}
              </span>
            </div>
            {userRating > 0 && (
              <span
                className={cn(
                  "text-[10px]",
                  isDark ? "text-blue-400" : "text-blue-600",
                )}
              >
                Your: {userRating}/5
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MovieDetail({
  movie,
  isWatched,
  userRating,
  isDark,
  onToggleWatched,
  onRate,
  onOpenExternal,
  onSendFollowUp,
  onBack,
}: {
  movie: Movie;
  isWatched: boolean;
  userRating: number;
  isDark: boolean;
  onToggleWatched: () => void;
  onRate: (rating: number) => void;
  onOpenExternal?: (url: string) => void;
  onSendFollowUp?: (message: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <button
        onClick={onBack}
        className={cn(
          "mb-3 flex items-center gap-1 text-sm transition-colors",
          isDark
            ? "text-zinc-400 hover:text-white"
            : "text-zinc-500 hover:text-zinc-900",
        )}
      >
        <ChevronLeft size={16} />
        Back to list
      </button>

      <div className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "mb-4 flex h-24 w-full items-center justify-center rounded-lg text-5xl",
            isDark ? "bg-zinc-800" : "bg-zinc-100",
          )}
        >
          {movie.posterEmoji}
        </div>

        <h2
          className={cn(
            "mb-1 font-bold text-xl",
            isDark ? "text-white" : "text-zinc-900",
          )}
        >
          {movie.title}
        </h2>

        <div
          className={cn(
            "mb-3 flex items-center gap-2 text-sm",
            isDark ? "text-zinc-400" : "text-zinc-500",
          )}
        >
          <span>{movie.year}</span>
          <span>&middot;</span>
          <span>{movie.director}</span>
          <span>&middot;</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              isDark
                ? "bg-zinc-800 text-zinc-300"
                : "bg-zinc-100 text-zinc-600",
            )}
          >
            {GENRE_LABELS[movie.genre]}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span
              className={cn(
                "text-sm font-medium",
                isDark ? "text-white" : "text-zinc-900",
              )}
            >
              {movie.rating.toFixed(1)}/5
            </span>
          </div>
          <button
            onClick={onToggleWatched}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              isWatched
                ? "bg-green-500/10 text-green-500"
                : isDark
                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            {isWatched ? (
              <BookmarkCheck size={12} />
            ) : (
              <Bookmark size={12} />
            )}
            {isWatched ? "Watched" : "Add to watched"}
          </button>
        </div>

        <p
          className={cn(
            "mb-4 text-sm leading-relaxed",
            isDark ? "text-zinc-300" : "text-zinc-600",
          )}
        >
          {movie.synopsis}
        </p>

        <div className="mb-4">
          <p
            className={cn(
              "mb-1 text-xs font-medium",
              isDark ? "text-zinc-400" : "text-zinc-500",
            )}
          >
            Your Rating
          </p>
          <StarRating rating={userRating} onRate={onRate} isDark={isDark} />
        </div>

        <div className="flex flex-wrap gap-2">
          {movie.imdbUrl && (
            <button
              onClick={() => onOpenExternal?.(movie.imdbUrl!)}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isDark
                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
              )}
            >
              <ExternalLink size={12} />
              View on IMDB
            </button>
          )}
          <button
            onClick={() =>
              onSendFollowUp?.(
                `Tell me more about "${movie.title}" (${movie.year})`,
              )
            }
            className={cn(
              "flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isDark
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-blue-600 text-white hover:bg-blue-700",
            )}
          >
            <MessageCircle size={12} />
            Ask about this film
          </button>
        </div>
      </div>
    </div>
  );
}

export function MovieWatchlist({
  movies,
  title = "Movie Watchlist",
  displayMode,
  widgetState,
  theme,
  hasModelContext,
  onWidgetStateChange,
  onRequestDisplayMode,
  onRateMovie,
  onFilterGenre,
  onOpenExternal,
  onSendFollowUp,
  onUpdatePreferences,
  onLog,
}: MovieWatchlistProps) {
  const isDark = theme === "dark";
  const [showDetail, setShowDetail] = useState(false);

  const selectedMovie = useMemo(
    () => movies.find((m) => m.id === widgetState.selectedMovieId) ?? null,
    [movies, widgetState.selectedMovieId],
  );

  const filteredMovies = useMemo(() => {
    if (!widgetState.genreFilter) return movies;
    return movies.filter((m) => m.genre === widgetState.genreFilter);
  }, [movies, widgetState.genreFilter]);

  const watchedCount = useMemo(
    () => movies.filter((m) => widgetState.watchedIds.includes(m.id)).length,
    [movies, widgetState.watchedIds],
  );

  const genres = useMemo(() => {
    const g = new Set(movies.map((m) => m.genre));
    return Array.from(g).sort();
  }, [movies]);

  const handleSelectMovie = useCallback(
    (movieId: string) => {
      onWidgetStateChange({ selectedMovieId: movieId });
      setShowDetail(true);
      onLog?.("movie_selected", { movieId });
    },
    [onWidgetStateChange, onLog],
  );

  const handleToggleWatched = useCallback(
    (movieId: string) => {
      const isWatched = widgetState.watchedIds.includes(movieId);
      const next = isWatched
        ? widgetState.watchedIds.filter((id) => id !== movieId)
        : [...widgetState.watchedIds, movieId];
      onWidgetStateChange({ watchedIds: next });
      onLog?.(isWatched ? "movie_unwatched" : "movie_watched", { movieId });
    },
    [widgetState.watchedIds, onWidgetStateChange, onLog],
  );

  const handleRate = useCallback(
    (movieId: string, rating: number) => {
      onWidgetStateChange({
        ratings: { ...widgetState.ratings, [movieId]: rating },
      });
      onRateMovie?.(movieId, rating);
      onLog?.("movie_rated", { movieId, rating });
    },
    [widgetState.ratings, onWidgetStateChange, onRateMovie, onLog],
  );

  const handleFilterGenre = useCallback(
    (genre: Genre | null) => {
      onWidgetStateChange({ genreFilter: genre });
      onFilterGenre?.(genre);
      onLog?.("genre_filtered", { genre });
    },
    [onWidgetStateChange, onFilterGenre, onLog],
  );

  const handleBack = useCallback(() => {
    setShowDetail(false);
    onWidgetStateChange({ selectedMovieId: null });
  }, [onWidgetStateChange]);

  const isFullscreen = displayMode === "fullscreen";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden",
        isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-4 py-2.5",
          isDark ? "border-zinc-800" : "border-zinc-200",
        )}
      >
        <div className="flex items-center gap-2">
          <Film size={18} className={isDark ? "text-zinc-400" : "text-zinc-500"} />
          <h1
            className={cn(
              "font-semibold text-sm",
              isDark ? "text-white" : "text-zinc-900",
            )}
          >
            {title}
          </h1>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px]",
              isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500",
            )}
          >
            {watchedCount}/{movies.length} watched
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Genre filter */}
          <div className="relative">
            <select
              value={widgetState.genreFilter ?? ""}
              onChange={(e) =>
                handleFilterGenre(
                  e.target.value ? (e.target.value as Genre) : null,
                )
              }
              className={cn(
                "appearance-none rounded-md py-1 pl-6 pr-2 text-xs outline-none",
                isDark
                  ? "bg-zinc-800 text-zinc-300"
                  : "bg-zinc-100 text-zinc-600",
              )}
            >
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {GENRE_LABELS[g as Genre]}
                </option>
              ))}
            </select>
            <Filter
              size={12}
              className={cn(
                "pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2",
                isDark ? "text-zinc-500" : "text-zinc-400",
              )}
            />
          </div>

          {/* Display mode toggle */}
          <button
            onClick={() =>
              onRequestDisplayMode(isFullscreen ? "inline" : "fullscreen")
            }
            className={cn(
              "rounded-md p-1.5 transition-colors",
              isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-100",
            )}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2
                size={14}
                className={isDark ? "text-zinc-400" : "text-zinc-500"}
              />
            ) : (
              <Maximize2
                size={14}
                className={isDark ? "text-zinc-400" : "text-zinc-500"}
              />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {showDetail && selectedMovie ? (
          <MovieDetail
            movie={selectedMovie}
            isWatched={widgetState.watchedIds.includes(selectedMovie.id)}
            userRating={widgetState.ratings[selectedMovie.id] ?? 0}
            isDark={isDark}
            onToggleWatched={() => handleToggleWatched(selectedMovie.id)}
            onRate={(r) => handleRate(selectedMovie.id, r)}
            onOpenExternal={onOpenExternal}
            onSendFollowUp={onSendFollowUp}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isWatched={widgetState.watchedIds.includes(movie.id)}
                userRating={widgetState.ratings[movie.id] ?? 0}
                isSelected={movie.id === widgetState.selectedMovieId}
                isDark={isDark}
                onToggleWatched={() => handleToggleWatched(movie.id)}
                onSelect={() => handleSelectMovie(movie.id)}
                onOpenExternal={onOpenExternal}
              />
            ))}
            {filteredMovies.length === 0 && (
              <div
                className={cn(
                  "py-8 text-center text-sm",
                  isDark ? "text-zinc-500" : "text-zinc-400",
                )}
              >
                No movies match this filter.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-t px-4 py-2",
          isDark ? "border-zinc-800" : "border-zinc-200",
        )}
      >
        <button
          onClick={() =>
            onSendFollowUp?.("Recommend more movies based on my watchlist")
          }
          className={cn(
            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            isDark
              ? "bg-blue-600 text-white hover:bg-blue-500"
              : "bg-blue-600 text-white hover:bg-blue-700",
          )}
        >
          <MessageCircle size={12} />
          Get more recs
        </button>

        {hasModelContext && (
          <button
            onClick={() => {
              const topGenres = genres.slice(0, 3) as Genre[];
              onUpdatePreferences?.(topGenres);
              onLog?.("preferences_updated", { genres: topGenres });
            }}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-500 hover:text-zinc-900",
            )}
          >
            Sync preferences
          </button>
        )}
      </div>
    </div>
  );
}
