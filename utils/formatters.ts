
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(value);
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-AR').format(new Date(date));
};

export const formatCuit = (cuit: string): string => {
  if (cuit.length !== 11) return cuit;
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
};

export const calculateIVA = (net: number, rate: number): number => {
  return net * rate;
};
