import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Snowflake, Wind, Droplets, MapPin, RefreshCw, Thermometer, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClothingItems } from '@/hooks/useClothingItems';
import { useProfile } from '@/hooks/useProfile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
}

interface OutfitOption {
  label: string;
  item_ids: string[];
}

interface WeatherOutfitResponse {
  weather: WeatherData;
  outfits: OutfitOption[];
  suggested_purchases: string[];
  perceivedTemperature: number;
}

export function WeatherOutfits() {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [outfits, setOutfits] = useState<OutfitOption[]>([]);
  const [purchaseSuggestions, setPurchaseSuggestions] = useState<string[]>([]);
  const [perceivedTemp, setPerceivedTemp] = useState<number | null>(null);
  const [coldTolerance, setColdTolerance] = useState<string>('normal');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  const { toast } = useToast();
  const { items: clothingItems } = useClothingItems();
  const { profile, updateProfile } = useProfile();

  useEffect(() => {
    if (profile?.cold_tolerance) {
      setColdTolerance(profile.cold_tolerance);
    }
  }, [profile]);

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle')) return <CloudRain className="h-8 w-8 text-blue-500" />;
    if (lower.includes('snow')) return <Snowflake className="h-8 w-8 text-blue-300" />;
    if (lower.includes('cloud') || lower.includes('fog')) return <Cloud className="h-8 w-8 text-muted-foreground" />;
    return <Sun className="h-8 w-8 text-yellow-500" />;
  };

  const getLocation = async () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      toast({ title: 'Location not supported', description: 'Your browser does not support geolocation.', variant: 'destructive' });
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        try {
          const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || '';
            const state = geoData.address?.state || '';
            setLocationName(city ? `${city}${state ? `, ${state}` : ''}` : 'Your location');
          }
        } catch {
          setLocationName('Your location');
        }
        setLocationLoading(false);
        fetchWeatherOutfits(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({ title: 'Location access denied', description: 'Please enable location access to get weather-based suggestions.', variant: 'destructive' });
        setLocationLoading(false);
      }
    );
  };

  const fetchWeatherOutfits = async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather-outfits', {
        body: {
          latitude,
          longitude,
          wardrobeItems: clothingItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            color: item.color,
            ai_description: (item as any).ai_description || null,
          })),
          coldTolerance,
        },
      });

      if (error) throw error;

      const response = data as WeatherOutfitResponse;
      setWeather(response.weather);
      // Support both old format (selected_wardrobe_ids) and new format (outfits)
      if (response.outfits && response.outfits.length > 0) {
        setOutfits(response.outfits);
      } else if ((response as any).selected_wardrobe_ids) {
        setOutfits([{ label: 'Today\'s Outfit', item_ids: (response as any).selected_wardrobe_ids }]);
      }
      setPurchaseSuggestions(response.suggested_purchases || []);
      setPerceivedTemp(response.perceivedTemperature);
    } catch (error: any) {
      console.error('Error fetching weather outfits:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to get weather-based suggestions. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToleranceChange = async (value: string) => {
    setColdTolerance(value);
    await updateProfile({ cold_tolerance: value });
    if (location) fetchWeatherOutfits(location.lat, location.lon);
  };

  const refresh = () => {
    if (location) fetchWeatherOutfits(location.lat, location.lon);
    else getLocation();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{locationName || 'Get your location'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading || locationLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Cold tolerance */}
      <div className="flex items-center gap-3">
        <Thermometer className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">I run:</span>
        <Select value={coldTolerance} onValueChange={handleToleranceChange}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cold-blooded">Cold (layer up!)</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="warm-blooded">Hot (stay cool)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* No location prompt */}
      {!weather && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Get weather-aware outfit suggestions based on your location
            </p>
            <Button onClick={getLocation} disabled={locationLoading}>
              {locationLoading ? 'Getting location...' : 'Enable Location'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <Card><CardContent className="py-6"><div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="space-y-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-32" /></div></div></CardContent></Card>
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="py-4 space-y-3"><Skeleton className="h-5 w-28" /><div className="grid grid-cols-3 gap-3">{[1,2,3].map(j => <Skeleton key={j} className="aspect-square rounded-lg" />)}</div></CardContent></Card>
          ))}
        </div>
      )}

      {/* Results */}
      {weather && !loading && (
        <>
          {/* Weather card */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getWeatherIcon(weather.condition)}
                  <div>
                    <div className="text-3xl font-semibold">{weather.temperature}°C</div>
                    <div className="text-sm text-muted-foreground">
                      Feels like {weather.feelsLike}°C
                      {perceivedTemp !== weather.feelsLike && <span className="ml-1">(you: {perceivedTemp}°C)</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center justify-end gap-1"><Droplets className="h-3 w-3" />{weather.humidity}%</div>
                  <div className="flex items-center justify-end gap-1"><Wind className="h-3 w-3" />{weather.windSpeed} km/h</div>
                </div>
              </div>
              <div className="mt-2 text-sm font-medium">{weather.condition}</div>
            </CardContent>
          </Card>

          {/* 3 Outfit options */}
          {outfits.map((outfit, index) => {
            const items = outfit.item_ids.map(id => clothingItems.find(i => i.id === id)).filter(Boolean);
            return (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="secondary">Outfit {index + 1}</Badge>
                    <span>{outfit.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {items.map((item) => item && (
                        <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-background/80 backdrop-blur-sm p-2">
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No matching items found in your wardrobe for this outfit.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Purchase suggestions */}
          {purchaseSuggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Suggested Additions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {purchaseSuggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="mt-0.5 shrink-0 text-xs">{i + 1}</Badge>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
