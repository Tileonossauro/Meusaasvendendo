/**
 * RELOGIO INJETAVEL.
 *
 * Agentes nao escrevem timestamp a mao. Todo evento de historico recebe a hora
 * do relogio real no momento da execucao; nos testes o relogio e injetado para
 * preservar determinismo.
 *
 * Motivo: eventos foram registrados uma vez com horarios que ainda estavam no
 * futuro, o que corrompe a integridade do historico. Ver ADR 0008.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Relogio fixo para testes. */
export function fixedClock(iso: string): Clock {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`fixedClock recebeu data invalida: ${iso}`);
  }
  return { now: () => date };
}
