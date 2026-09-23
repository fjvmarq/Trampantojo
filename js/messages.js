/* Trampantojo — el mensaje del día.
   No son frases de taza: cada mensaje sale de TUS datos (racha, ritmo, lo
   perdido, la meta). Se elige el que más importa hoy y, si hay empate, el día
   decide cuál, para que no cambie cada vez que abres la app.
   Tono: de apoyo, nunca de culpa. Un día malo no es un fracaso. */

import { kg1, shortDate } from './charts.js?v=0.7.0';
import { daysBetween } from './calc.js?v=0.7.0';

const pct1 = v => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(v);

function dayHash(iso) {
  let h = 0;
  for (const c of iso) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function messageOfTheDay(s, profile, now = new Date()) {
  const name = profile?.name ? profile.name.split(' ')[0] : '';
  const hour = now.getHours();
  const out = [];
  const add = (priority, title, text) => out.push({ priority, title, text });

  if (!s.hasData) {
    add(10, 'Empieza hoy',
      'Pésate por la mañana, después de ir al baño y antes de desayunar. Siempre igual: la tendencia hará el resto.');
  } else {
    const n = s.entries.length;
    const perWeek = s.rate?.perWeek;

    if (s.projection?.status === 'conseguido') {
      add(9, '¡Meta conseguida!',
        `Ahora toca mantener. Tu referencia pasa a unas ${Math.round(s.tdee)} kcal al día, y la tendencia es tu aviso si algo se tuerce.`);
    }
    if (s.startBmiZone && s.bmiZone && s.bmiZone.max < s.startBmiZone.max) {
      add(8, 'Has cambiado de zona',
        `Has pasado de «${s.startBmiZone.label}» a «${s.bmiZone.label}». Eso no es un número: es salud.`);
    }
    if (!s.projection || s.projection.status !== 'conseguido') {
      const left = s.trendKg - profile.goalKg;
      if (left > 0 && left < 2) add(7, 'Ya casi', `Te quedan ${kg1(left)} kg para tu meta.`);
    }
    if (s.lostPct >= 10) {
      add(6, `${pct1(s.lostPct)} % menos`, 'Has perdido más del 10 % de tu peso. A tu corazón y a tus rodillas se les nota.');
    } else if (s.lostPct >= 5) {
      add(6, `${pct1(s.lostPct)} % menos`, 'Con un 5 % menos ya mejoran la tensión y el azúcar en sangre. Vas por buen camino.');
    }
    if (n < 7) {
      add(5, n === 1 ? 'Primer día apuntado' : `${n} días apuntados`,
        'La primera semana el peso baila mucho por el agua. No mires un día suelto: la línea de tendencia se asienta en unos días.');
    }
    if (!s.weighedToday && hour < 12) {
      add(4, '¿Te has pesado hoy?', 'Mismo momento, misma báscula. Cinco segundos y listo.');
    }
    if (s.streak >= 7) {
      add(3, `${s.streak} días seguidos`, 'Pesarte cada día es lo que más ayuda a la larga. La constancia gana a la fuerza de voluntad.');
    }
    if (perWeek != null && n >= 7) {
      if (perWeek <= -0.2) {
        add(3, 'La tendencia baja',
          `A ${kg1(-perWeek)} kg por semana. Así, sin prisas, es como luego se mantiene.`);
      } else if (perWeek >= 0.2) {
        add(3, 'Semana de subida',
          'Pasa, y casi siempre es agua: sal, una comida fuera, poco sueño. Mira los últimos 30 días, no los últimos 3.');
      } else if (s.daysTracked >= 21) {
        add(2, 'Unos días estable',
          'Es normal: el cuerpo se ajusta. Si sigue igual dos semanas más, revisa las raciones o suma pasos.');
      }
    }
    const won = (s.milestones || []).find(m => m.status === 'conseguido' && m.reachedOn && daysBetween(m.reachedOn, s.today) <= 7);
    if (won) {
      add(9, '¡Objetivo conseguido!', `${won.name ? `«${won.name}»` : `${kg1(won.kg)} kg`}: lo lograste el ${shortDate(won.reachedOn)}. Apúntate el siguiente.`);
    }
    const nm = s.nextMilestone;
    if (nm && nm.days <= 14 && nm.left > 0) {
      add(5, `Se acerca ${nm.name ? `«${nm.name}»` : 'tu objetivo'}`,
        nm.status === 'en-camino'
          ? `Quedan ${nm.days} días y ${kg1(nm.left)} kg. A tu ritmo llegas: sigue igual.`
          : `Quedan ${nm.days} días y ${kg1(nm.left)} kg: hacen falta ${kg1(nm.needed)} kg por semana. Cada día cuenta.`);
    }
    if (s.pace?.status === 'ahead' && n >= 7) {
      add(4, 'Por delante de tu plan', `Vas ${kg1(-s.pace.diff)} kg mejor de lo previsto. Sin prisa: lo que se baja despacio no vuelve.`);
    } else if (s.pace?.status === 'behind' && n >= 7) {
      add(4, 'Un poco por detrás del plan', `Vas ${kg1(s.pace.diff)} kg por encima de lo previsto. No pasa nada: una semana ordenada y vuelves al carril.`);
    }
    if (s.week && now.getDay() === 1 && s.week.change != null) {
      const ch = s.week.change;
      add(6, 'Tu semana', `${ch <= -0.1 ? `Tu tendencia bajó ${kg1(-ch)} kg` : ch >= 0.1 ? `Tu tendencia subió ${kg1(ch)} kg` : 'Tu tendencia se mantuvo'}`
        + `${s.week.cur.foodDays ? `, comiste de media ${Math.round(s.week.cur.avgKcal / 10) * 10} kcal` : ''}`
        + `${s.week.cur.cravings ? ` y venciste ${s.week.cur.beaten} de ${s.week.cur.cravings} antojos` : ''}. Semana nueva: a por ella.`);
    }
    const cr = profile && s.cravings ? s.cravings : null;
    if (cr && cr.length >= 3) {
      const byHour = Array(24).fill(0);
      cr.forEach(c => { byHour[c.hour]++; });
      const peak = byHour.indexOf(Math.max(...byHour));
      const lead = (peak - hour + 24) % 24;
      if (byHour[peak] >= 2 && lead >= 0 && lead <= 1) {
        add(6, 'Se acerca tu hora', `Suele darte un antojo sobre las ${peak}:00. Ten a mano una alternativa (fruta, un yogur, una infusión) y, si llega, pulsa «Tengo un antojo».`);
      }
      const won = cr.filter(c => c.date === s.today && (c.outcome === 'resistido' || c.outcome === 'alternativa')).length;
      if (won) add(5, won === 1 ? 'Antojo vencido' : `${won} antojos vencidos hoy`, 'Cada vez que dejas pasar la ola, el hábito se debilita un poco. Así se cambia de verdad.');
    }
    add(1, name ? `Hola, ${name}` : 'Hola',
      'Un día bueno no te hace delgado y un día malo no te hace gordo. Lo que cuenta es la línea, y la línea la haces tú.');
  }

  const top = Math.max(...out.map(m => m.priority));
  const best = out.filter(m => m.priority === top);
  return best[dayHash(s.today || '') % best.length];
}
