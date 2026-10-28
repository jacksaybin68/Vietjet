import { describe, it, expect } from 'vitest';
import {
  resolveAircraft,
  normalizeAircraftName,
  AIRCRAFT_MODELS,
  mapFlightRecordToFlight,
} from '@/features/flights';
import { resolveAircraftSeatType } from '@/features/bookings/components/SeatMap';
import type { FlightRecord } from '@/lib/db';

describe('Vietjet Aircraft Resolution & Fleet Support', () => {
  describe('Curated schedule flight aircraft resolution', () => {
    it('resolves widebody Airbus A330-300 for high-density trunk and intercontinental flights', () => {
      // HAN-SGN wide-body flights
      expect(resolveAircraft('VJ135')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ 135')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ157')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ126')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ134')).toBe(AIRCRAFT_MODELS.A330);

      // Australia flights
      expect(resolveAircraft('VJ085')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ086')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ063')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ083')).toBe(AIRCRAFT_MODELS.A330);

      // Japan / Korea flights
      expect(resolveAircraft('VJ862')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ822')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ932')).toBe(AIRCRAFT_MODELS.A330);
    });

    it('resolves Airbus A320 for short regional flights with shorter runways', () => {
      expect(resolveAircraft('VJ721')).toBe(AIRCRAFT_MODELS.A320);
      expect(resolveAircraft('VJ291')).toBe(AIRCRAFT_MODELS.A320); // Điện Biên
      expect(resolveAircraft('VJ1031')).toBe(AIRCRAFT_MODELS.A320); // Côn Đảo
      expect(resolveAircraft('VJ1041')).toBe(AIRCRAFT_MODELS.A320); // Rạch Giá
      expect(resolveAircraft('VJ211')).toBe(AIRCRAFT_MODELS.A320); // Vinh
    });

    it('resolves Airbus A321neo and Airbus A321 for standard routes', () => {
      expect(resolveAircraft('VJ121')).toBe(AIRCRAFT_MODELS.A321NEO);
      expect(resolveAircraft('VJ123')).toBe(AIRCRAFT_MODELS.A321NEO);
      expect(resolveAircraft('VJ501')).toBe(AIRCRAFT_MODELS.A321NEO);
      expect(resolveAircraft('VJ503')).toBe(AIRCRAFT_MODELS.A321);
      expect(resolveAircraft('VJ624')).toBe(AIRCRAFT_MODELS.A321);
    });

    it('resolves business wave twin flights with the exact same aircraft model as economy', () => {
      // VJ3005 is twin of VJ135 (A330)
      expect(resolveAircraft('VJ3005')).toBe(AIRCRAFT_MODELS.A330);
      // VJ3001 is twin of VJ121 (A321neo)
      expect(resolveAircraft('VJ3001')).toBe(AIRCRAFT_MODELS.A321NEO);
    });
  });

  describe('Route-based and carrier heuristics', () => {
    it('assigns widebody A330 to unknown flights flying to Australia or India', () => {
      expect(resolveAircraft('VJ8881', 'SGN', 'SYD')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ8882', 'MEL', 'HAN')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ8883', 'HAN', 'DEL')).toBe(AIRCRAFT_MODELS.A330);
    });

    it('assigns A320 to unknown flights on short regional routes', () => {
      expect(resolveAircraft('VJ8884', 'HAN', 'DIN')).toBe(AIRCRAFT_MODELS.A320);
      expect(resolveAircraft('VJ8885', 'SGN', 'VCS')).toBe(AIRCRAFT_MODELS.A320);
    });

    it('handles Thai Vietjet (VZ) codes with Boeing 737 MAX or A320', () => {
      const vzAircraft = resolveAircraft('VZ101');
      expect([AIRCRAFT_MODELS.B737_MAX, AIRCRAFT_MODELS.A320]).toContain(vzAircraft);
    });
  });

  describe('Raw aircraft normalization', () => {
    it('normalizes common aircraft codes into full friendly names', () => {
      expect(normalizeAircraftName('A321neo')).toBe(AIRCRAFT_MODELS.A321NEO);
      expect(normalizeAircraftName('A321')).toBe(AIRCRAFT_MODELS.A321);
      expect(normalizeAircraftName('A320')).toBe(AIRCRAFT_MODELS.A320);
      expect(normalizeAircraftName('A330')).toBe(AIRCRAFT_MODELS.A330);
      expect(normalizeAircraftName('A330-300')).toBe(AIRCRAFT_MODELS.A330);
      expect(normalizeAircraftName('B737')).toBe(AIRCRAFT_MODELS.B737_MAX);
      expect(normalizeAircraftName('Boeing 737')).toBe(AIRCRAFT_MODELS.B737_MAX);
      expect(normalizeAircraftName('B787')).toBe(AIRCRAFT_MODELS.B787);
    });

    it('respects rawAircraft parameter in resolveAircraft', () => {
      expect(resolveAircraft('VJ121', 'HAN', 'SGN', 'A330')).toBe(AIRCRAFT_MODELS.A330);
      expect(resolveAircraft('VJ121', 'HAN', 'SGN', 'Boeing 737 MAX')).toBe(AIRCRAFT_MODELS.B737_MAX);
    });
  });

  describe('mapFlightRecordToFlight integration', () => {
    it('populates aircraft property on mapped Flight for A330 flight', () => {
      const mockRow: FlightRecord = {
        id: 'f-a330',
        flight_no: 'VJ135',
        from_code: 'HAN',
        to_code: 'SGN',
        depart_time: '2026-11-01T13:30:00+07:00',
        arrive_time: '2026-11-01T15:40:00+07:00',
        price: 1190000,
        economy_price: 1190000,
        business_price: 3296300,
        class: 'economy',
        available: 377,
        status: 'active',
        gate: '12',
        terminal: 'T1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mapped = mapFlightRecordToFlight(mockRow);
      expect(mapped.aircraft).toBe(AIRCRAFT_MODELS.A330);
      expect(mapped.airline).toBe('Vietjet Air');
    });

    it('populates aircraft property for A320 regional flight', () => {
      const mockRow: FlightRecord = {
        id: 'f-a320',
        flight_no: 'VJ291',
        from_code: 'HAN',
        to_code: 'DIN',
        depart_time: '2026-11-01T08:00:00+07:00',
        arrive_time: '2026-11-01T09:00:00+07:00',
        price: 890000,
        economy_price: 890000,
        business_price: 2465300,
        class: 'economy',
        available: 180,
        status: 'active',
        gate: null,
        terminal: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mapped = mapFlightRecordToFlight(mockRow);
      expect(mapped.aircraft).toBe(AIRCRAFT_MODELS.A320);
    });
  });

  describe('SeatMap aircraft type resolution', () => {
    it('correctly maps various strings to supported seat map models', () => {
      expect(resolveAircraftSeatType('Airbus A330-300')).toBe('A330');
      expect(resolveAircraftSeatType('A330')).toBe('A330');
      expect(resolveAircraftSeatType('Airbus A321neo')).toBe('A321neo');
      expect(resolveAircraftSeatType('Airbus A320')).toBe('A320');
      expect(resolveAircraftSeatType('Boeing 737 MAX')).toBe('B737');
      expect(resolveAircraftSeatType('B737')).toBe('B737');
      expect(resolveAircraftSeatType(undefined)).toBe('A321');
    });
  });
});
