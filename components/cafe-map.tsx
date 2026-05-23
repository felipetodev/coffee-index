"use client"

import { useEffect, useState } from "react"
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps"
import { MapPinIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const SANTIAGO_CENTER = { lat: -33.4489, lng: -70.6693 }

type LatLngLiteral = {
  lat: number
  lng: number
}

type GeocodeResponse = {
  results: Array<{
    geometry: {
      location: {
        lat: () => number
        lng: () => number
      }
    }
  }>
}

type CafeMapProps = {
  addresses: string[]
  name: string
  className?: string
}

export function CafeMap({ addresses, name, className }: CafeMapProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <MapFallback
        addresses={addresses}
        className={className}
        message="Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para activar el mapa."
        name={name}
      />
    )
  }

  return (
    <div
      className={cn(
        "h-64 overflow-hidden rounded-lg border bg-muted",
        className
      )}
    >
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="es" region="CL">
        <Map
          defaultCenter={SANTIAGO_CENTER}
          defaultZoom={12}
          gestureHandling="cooperative"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          reuseMaps
        >
          <GeocodedCafeLocation addresses={addresses} name={name} />
        </Map>
      </APIProvider>
    </div>
  )
}

function GeocodedCafeLocation({
  addresses,
  name,
}: {
  addresses: string[]
  name: string
}) {
  const map = useMap()
  const geocodingLib = useMapsLibrary("geocoding")
  const [selectedAddress, setSelectedAddress] = useState(addresses[0] ?? "")
  const [position, setPosition] = useState<LatLngLiteral | null>(null)

  useEffect(() => {
    if (!geocodingLib || !map || !selectedAddress) {
      return
    }

    let isCurrent = true
    const geocoder = new geocodingLib.Geocoder()

    geocoder
      .geocode({ address: `${selectedAddress}, Chile` })
      .then(({ results }: GeocodeResponse) => {
        if (!isCurrent || !results[0]) {
          return
        }

        const location = results[0].geometry.location
        const nextPosition = {
          lat: location.lat(),
          lng: location.lng(),
        }

        setPosition(nextPosition)
        map.setCenter(location)
        map.setZoom(16)
      })
      .catch(() => {
        if (isCurrent) {
          setPosition(null)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [geocodingLib, map, selectedAddress])

  return (
    <>
      {position && <Marker position={position} title={name} />}
      {addresses.length > 1 && (
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] gap-2 overflow-x-auto rounded-lg bg-background/90 p-2 shadow-sm ring-1 ring-border backdrop-blur">
          {addresses.map((address) => (
            <Button
              key={address}
              variant={address === selectedAddress ? "default" : "outline"}
              size="xs"
              onClick={() => setSelectedAddress(address)}
            >
              {address}
            </Button>
          ))}
        </div>
      )}
    </>
  )
}

function MapFallback({
  addresses,
  className,
  message,
  name,
}: CafeMapProps & {
  message: string
}) {
  return (
    <div
      className={cn(
        "grid h-64 place-items-center rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground",
        className
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-3">
        <MapPinIcon className="text-foreground" />
        <div>
          <p className="font-medium text-foreground">{name}</p>
          <p className="mt-1">{addresses[0]}</p>
        </div>
        <p>{message}</p>
      </div>
    </div>
  )
}
