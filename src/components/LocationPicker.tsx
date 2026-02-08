import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Navigation, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  value: string;
  onChange: (locationName: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}

export function LocationPicker({ value, onChange, placeholder = "Enter address", className }: LocationPickerProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for autocomplete
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const results: LocationResult[] = await response.json();
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Location search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  const handleSelectLocation = (location: LocationResult) => {
    // Create a shorter display name
    const parts = location.display_name.split(',');
    const shortName = parts.slice(0, 3).join(',').trim();
    
    setInputValue(shortName);
    onChange(shortName, parseFloat(location.lat), parseFloat(location.lon));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support location detection.',
        variant: 'destructive',
      });
      return;
    }

    setIsDetecting(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      
      // Build a readable address
      const address = data.address;
      let locationName = '';
      
      if (address) {
        const parts = [
          address.house_number,
          address.road,
          address.neighbourhood || address.suburb,
          address.city || address.town || address.village,
        ].filter(Boolean);
        locationName = parts.join(', ');
      }
      
      if (!locationName) {
        locationName = data.display_name?.split(',').slice(0, 3).join(',').trim() || 'Current Location';
      }

      setInputValue(locationName);
      onChange(locationName, latitude, longitude);

      toast({
        title: 'Location detected',
        description: locationName,
      });
    } catch (error) {
      console.error('Location detection error:', error);
      
      let message = 'Could not detect your location.';
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable it in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
        }
      }
      
      toast({
        title: 'Location detection failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const clearInput = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            className="pl-10 pr-8"
          />
          {inputValue && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={detectLocation}
          disabled={isDetecting}
          title="Detect my location"
        >
          {isDetecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((location, index) => (
            <button
              key={`${location.lat}-${location.lon}-${index}`}
              type="button"
              onClick={() => handleSelectLocation(location)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
            >
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{location.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
