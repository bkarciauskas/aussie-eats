"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useLocation } from "@/components/location-provider";
import { buildRestaurantSearchParams } from "@/lib/restaurant-query";
import {
  clearRecentSearches,
  isSearchSuggestion,
  loadRecentSearches,
  pushRecentSearch,
  type RecentSuggestion,
  type SearchSuggestion,
} from "@/lib/search-suggestions";

type RestaurantSearchProps = {
  variant: "hero" | "header";
  initialQ?: string;
  className?: string;
};

type DebugPayload = {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
};

function writeDebugLog(payload: DebugPayload) {
  void fetch("/api/debug/ui-log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

function RestaurantSearchForm({
  variant,
  initialQ = "",
  className = "",
}: RestaurantSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { location, hydrated } = useLocation();
  const [pending, startTransition] = useTransition();
  const disabled = pending || !hydrated;
  const qDefault = initialQ || searchParams.get("q") || "";
  const [query, setQuery] = useState(qDefault);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const formRef = useRef<HTMLFormElement>(null);
  const listboxId = `restaurant-search-${variant}-suggestions`;

  useEffect(() => {
    setQuery(qDefault);
  }, [qDefault]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !formRef.current?.contains(event.target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "suggestions" in data &&
          Array.isArray(data.suggestions)
        ) {
          const validSuggestions = data.suggestions.filter(isSearchSuggestion);
          // #region agent log
          writeDebugLog({ hypothesisId: "A", location: "restaurant-search.tsx:fetch-suggestions", message: "Suggestion response passed validation", data: { responseCount: data.suggestions.length, validCount: validSuggestions.length, kinds: validSuggestions.map((suggestion) => suggestion.kind) }, timestamp: Date.now() });
          // #endregion
          setSuggestions(validSuggestions);
          setActiveIndex(-1);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!open || suggestions.length === 0) return;

    const listbox = document.getElementById(listboxId);
    const dropdown = listbox?.parentElement;
    const hero = formRef.current?.closest(".hero");
    const optionRects = Array.from(listbox?.children ?? []).map((option) => {
      const rect = option.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    });
    const dropdownRect = dropdown?.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();
    // #region agent log
    writeDebugLog({ hypothesisId: "B,C,D", location: "restaurant-search.tsx:suggestions-layout", message: "Rendered suggestion geometry", data: { stateCount: suggestions.length, domOptionCount: listbox?.children.length ?? 0, optionRects, dropdownRect: dropdownRect ? { top: dropdownRect.top, bottom: dropdownRect.bottom, height: dropdownRect.height, scrollHeight: dropdown?.scrollHeight } : null, heroRect: heroRect ? { top: heroRect.top, bottom: heroRect.bottom, height: heroRect.height, overflow: hero ? getComputedStyle(hero).overflow : null } : null, viewportHeight: window.innerHeight, dropdownOverflow: dropdown ? getComputedStyle(dropdown).overflow : null, dropdownZIndex: dropdown ? getComputedStyle(dropdown).zIndex : null }, timestamp: Date.now() });
    // #endregion
  }, [listboxId, open, suggestions]);

  function recentSuggestions(): RecentSuggestion[] {
    return loadRecentSearches(window.localStorage)
      .slice(0, 5)
      .map((label) => ({ kind: "recent", label }));
  }

  function addLocationParams(params: URLSearchParams) {
    if (
      location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng)
    ) {
      params.set("lat", String(location.lat));
      params.set("lng", String(location.lng));
      params.set("place", location.label);
    }
  }

  function navigate(path: string) {
    setOpen(false);
    setActiveIndex(-1);
    startTransition(() => router.push(path));
  }

  function navigateText(rawQ: string) {
    const params = buildRestaurantSearchParams({
      rawQ,
      urlCity: searchParams.get("city"),
      locationCity: location?.label,
      locationLat: location?.lat,
      locationLng: location?.lng,
      locationPlace: location?.label,
      cuisine: searchParams.get("cuisine"),
    });
    const qs = params.toString();
    navigate(qs ? `/restaurants?${qs}` : "/restaurants");
  }

  function selectSuggestion(suggestion: SearchSuggestion) {
    // #region agent log
    writeDebugLog({ hypothesisId: "A,D", location: "restaurant-search.tsx:selectSuggestion", message: "Suggestion selection invoked", data: { kind: suggestion.kind }, timestamp: Date.now() });
    // #endregion
    pushRecentSearch(window.localStorage, suggestion.label);
    setQuery(suggestion.label);

    switch (suggestion.kind) {
      case "restaurant":
        navigate(`/restaurants/${encodeURIComponent(suggestion.slug)}`);
        break;
      case "cuisine": {
        const params = new URLSearchParams({ cuisine: suggestion.label });
        addLocationParams(params);
        navigate(`/restaurants?${params.toString()}`);
        break;
      }
      case "city": {
        const params = new URLSearchParams({ city: suggestion.cityId });
        addLocationParams(params);
        navigate(`/restaurants?${params.toString()}`);
        break;
      }
      case "suburb":
      case "recent":
        navigateText(suggestion.label);
        break;
      default: {
        const _exhaustive: never = suggestion;
        return _exhaustive;
      }
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Location restores from localStorage after mount; wait so a saved pin is not dropped.
    if (!hydrated) return;

    const rawQ = query.trim();
    if (rawQ) pushRecentSearch(window.localStorage, rawQ);
    navigateText(rawQ);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setOpen(true);
    setActiveIndex(-1);
    if (!nextQuery.trim()) {
      setSuggestions(recentSuggestions());
    }
  }

  function onFocus() {
    setOpen(true);
    if (!query.trim()) {
      setSuggestions(recentSuggestions());
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      // #region agent log
      writeDebugLog({ hypothesisId: "A,B", location: "restaurant-search.tsx:onKeyDown", message: "Keyboard navigation reached suggestions", data: { key: event.key, stateCount: suggestions.length, activeIndex }, timestamp: Date.now() });
      // #endregion
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
  }

  function clearRecents() {
    clearRecentSearches(window.localStorage);
    setSuggestions([]);
    setActiveIndex(-1);
  }

  const formClass =
    variant === "hero"
      ? `hero-search ${className}`.trim()
      : `header-search ${className}`.trim();

  return (
    <form
      ref={formRef}
      className={formClass}
      onSubmit={onSubmit}
      role="search"
    >
      <label className="sr-only" htmlFor={`restaurant-search-${variant}`}>
        Search restaurants
      </label>
      <input
        id={`restaurant-search-${variant}`}
        name="q"
        type="search"
        value={query}
        onChange={onChange}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={
          variant === "hero"
            ? "Search restaurants, suburbs, cuisines…"
            : "Search…"
        }
        autoComplete="off"
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
      />
      <button type="submit" className={variant === "hero" ? "btn-primary" : "btn-secondary"} disabled={disabled}>
        Find
      </button>
      {open && suggestions.length > 0 ? (
        <div className="search-suggest">
          {suggestions[0]?.kind === "recent" ? (
            <div className="search-suggest-heading">
              <span>Recent searches</span>
              <button type="button" onClick={clearRecents}>
                Clear
              </button>
            </div>
          ) : null}
          <ul id={listboxId} role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                id={`${listboxId}-option-${index}`}
                key={`${suggestion.kind}-${suggestion.label}`}
                role="option"
                aria-selected={activeIndex === index}
              >
                <button
                  type="button"
                  className={activeIndex === index ? "is-active" : ""}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span>
                    <strong>{suggestion.label}</strong>
                    {suggestion.kind === "restaurant" ? (
                      <small>{suggestion.detail}</small>
                    ) : null}
                  </span>
                  <small className="search-suggest-kind">
                    {suggestion.kind === "recent"
                      ? "Recent"
                      : suggestion.kind.charAt(0).toUpperCase() +
                        suggestion.kind.slice(1)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}

function RestaurantSearchFallback({ variant, initialQ = "", className = "" }: RestaurantSearchProps) {
  const formClass =
    variant === "hero"
      ? `hero-search ${className}`.trim()
      : `header-search ${className}`.trim();

  return (
    <form className={formClass} role="search">
      <label className="sr-only" htmlFor={`restaurant-search-${variant}`}>
        Search restaurants
      </label>
      <input
        id={`restaurant-search-${variant}`}
        name="q"
        type="search"
        defaultValue={initialQ}
        placeholder={
          variant === "hero"
            ? "Search restaurants, suburbs, cuisines…"
            : "Search…"
        }
        autoComplete="off"
        disabled
      />
      <button type="submit" className={variant === "hero" ? "btn-primary" : "btn-secondary"} disabled>
        Find
      </button>
    </form>
  );
}

export function RestaurantSearch(props: RestaurantSearchProps) {
  return (
    <Suspense fallback={<RestaurantSearchFallback {...props} />}>
      <RestaurantSearchForm {...props} />
    </Suspense>
  );
}
