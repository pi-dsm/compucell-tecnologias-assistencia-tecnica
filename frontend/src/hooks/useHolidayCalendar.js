import { useEffect, useState } from 'react';
import api from '../services/api';
import { createHolidayCalendar } from '../utils/businessDays';

let cache = null; // feriados locais mudam pouco: um carregamento por sessão

export const resetHolidayCache = () => {
  cache = null;
};

// Devolve o calendário (nacionais sempre; locais assim que carregarem).
export default function useHolidayCalendar() {
  const [calendar, setCalendar] = useState(() => createHolidayCalendar(cache || []));

  useEffect(() => {
    if (cache) return;
    api
      .get('/holidays')
      .then(({ data }) => {
        cache = data.custom.map((h) => h.date);
        setCalendar(createHolidayCalendar(cache));
      })
      .catch(() => {}); // sem rede/permissão: segue só com os feriados nacionais
  }, []);

  return calendar;
}