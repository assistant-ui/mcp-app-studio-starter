"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_WATCHLIST_STATE,
  type Genre,
  MovieWatchlist,
  type WatchlistState,
} from "@/components/examples/movie-watchlist";
import {
  type DisplayMode,
  useCallTool,
  useCapabilities,
  useDisplayMode,
  useFeature,
  useLog,
  useOpenLink,
  useSendMessage,
  useTheme,
  useToolInput,
  useUpdateModelContext,
  useWidgetState,
} from "@/lib/sdk";

interface MovieWatchlistInput {
  movies: Array<{
    id: string;
    title: string;
    year: number;
    genre: string;
    director: string;
    rating: number;
    synopsis: string;
    posterEmoji: string;
    imdbUrl?: string;
  }>;
  title?: string;
}

/**
 * SDK wrapper for the Movie Watchlist widget.
 *
 * Exercises ALL SDK hooks:
 * - useToolInput: movie data from tool call
 * - useTheme: light/dark
 * - useCallTool: rate_movie, filter_movies, get_recommendations
 * - useDisplayMode: inline/pip/fullscreen
 * - useSendMessage: follow-up messages
 * - useCapabilities: full capability detection
 * - useFeature: widgetState, modelContext checks
 * - useWidgetState: persist watched/ratings
 * - useUpdateModelContext: share preferences with model
 * - useLog: structured event logging
 * - openModal: movie detail modal (with fallback)
 * - useOpenLink: external IMDB links
 */
export function MovieWatchlistSDK() {
  const toolInput = useToolInput<MovieWatchlistInput>();
  const input = useMemo(() => toolInput ?? { movies: [] }, [toolInput]);

  const [mode, requestDisplayMode] = useDisplayMode();
  const theme = useTheme();
  const openLink = useOpenLink();
  const sendMessage = useSendMessage();
  const callTool = useCallTool();
  const log = useLog();
  const capabilities = useCapabilities();
  const updateModelContext = useUpdateModelContext();

  const hasWidgetState = useFeature("widgetState");
  const hasModelContext = capabilities?.modelContext ?? false;

  const [persistedState, setPersistedState] =
    useWidgetState<WatchlistState>();
  const [localState, setLocalState] =
    useState<WatchlistState>(DEFAULT_WATCHLIST_STATE);

  const currentState = hasWidgetState
    ? (persistedState ?? DEFAULT_WATCHLIST_STATE)
    : localState;

  const handleWidgetStateChange = useCallback(
    (partial: Partial<WatchlistState>) => {
      const next = { ...currentState, ...partial };
      if (hasWidgetState) {
        setPersistedState(next);
      } else {
        setLocalState(next);
      }
    },
    [currentState, hasWidgetState, setPersistedState],
  );

  const handleRequestDisplayMode = useCallback(
    async (nextMode: DisplayMode) => {
      await requestDisplayMode(nextMode);
    },
    [requestDisplayMode],
  );

  const handleRateMovie = useCallback(
    async (movieId: string, rating: number) => {
      await callTool("rate_movie", { movie_id: movieId, rating });
    },
    [callTool],
  );

  const handleFilterGenre = useCallback(
    async (genre: Genre | null) => {
      await callTool("filter_movies", { genre });
    },
    [callTool],
  );

  const handleOpenExternal = useCallback(
    (url: string) => {
      void openLink(url);
    },
    [openLink],
  );

  const handleSendFollowUp = useCallback(
    async (message: string) => {
      await sendMessage(message);
    },
    [sendMessage],
  );

  const handleUpdatePreferences = useCallback(
    (genres: Genre[]) => {
      void updateModelContext({
        structuredContent: {
          preferredGenres: genres,
          watchedCount: currentState.watchedIds.length,
          ratings: currentState.ratings,
        },
      });
    },
    [updateModelContext, currentState],
  );

  const handleLog = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      void log("info", data ? `${message}: ${JSON.stringify(data)}` : message);
    },
    [log],
  );

  return (
    <MovieWatchlist
      movies={input.movies as any}
      title={input.title}
      displayMode={mode as unknown as DisplayMode}
      widgetState={currentState}
      theme={theme}
      hasModelContext={hasModelContext}
      onWidgetStateChange={handleWidgetStateChange}
      onRequestDisplayMode={handleRequestDisplayMode}
      onRateMovie={handleRateMovie}
      onFilterGenre={handleFilterGenre}
      onOpenExternal={handleOpenExternal}
      onSendFollowUp={handleSendFollowUp}
      onUpdatePreferences={handleUpdatePreferences}
      onLog={handleLog}
    />
  );
}
