// =============================================
// WEATHER SERVICE - Alertas climáticas para H&S
// =============================================
import { offlineService } from './offline.service';

export interface WeatherData {
    temp: number;
    condition: string;
    uvIndex: number;
    windSpeed: number;
    timestamp: string;
}

export const weatherService = {
    // En una app real, aquí iría la API key de MetService o OpenWeather
    // Por ahora simulamos la integración
    async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
        try {
            // Intentar obtener de cache si es reciente
            const cached = await offlineService.getLocal('current_weather');
            if (await offlineService.hasValidCache('current_weather', 30)) {
                return cached;
            }

            // Simulación de llamada API
            const mockData: WeatherData = {
                temp: 24,
                condition: 'Sunny',
                uvIndex: 8, // Riesgo alto
                windSpeed: 15,
                timestamp: new Date().toISOString(),
            };

            await offlineService.saveLocal('current_weather', mockData);
            return mockData;
        } catch (error) {
            console.error('Error fetching weather:', error);
            throw error;
        }
    },

    // Evaluar si se requieren alertas de salud y seguridad
    evaluateRisks(data: WeatherData): string[] {
        const alerts: string[] = [];

        if (data.uvIndex >= 7) {
            alerts.push('ALERTA UV: Riesgo alto. Aplicar protector solar y usar sombreros.');
        }

        if (data.temp >= 30) {
            alerts.push('ALERTA CALOR: Hidratación obligatoria cada 30 min.');
        }

        if (data.windSpeed >= 40) {
            alerts.push('ALERTA VIENTO: Precaución con escaleras y ramas.');
        }

        return alerts;
    }
};

export default weatherService;
