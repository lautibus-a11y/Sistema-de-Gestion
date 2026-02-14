
export enum TaxCondition {
  MONOTRIBUTO = 'Monotributo',
  RESPONSABLE_INSCRIPTO = 'Responsable Inscripto',
  EXENTO = 'Exento',
  CONSUMIDOR_FINAL = 'Consumidor Final'
}

export enum UserRole {
  ADMIN = 'Admin',
  EMPLOYEE = 'Empleado',
  ACCOUNTANT = 'Contador'
}

export interface Tenant {
  id: string;
  name: string;
  cuit: string;
  tax_condition: TaxCondition;
  address?: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  role: UserRole;
}

export interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  cuit?: string;
  tax_condition: TaxCondition;
  email?: string;
  phone?: string;
  is_provider: boolean;
  is_client: boolean;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku?: string;
  name: string;
  description?: string;
  price_sell_net: number;
  iva_rate: number;
  stock: number;
  min_stock: number;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  type: 'SALE' | 'EXPENSE';
  contact_id?: string;
  amount_net: number;
  amount_iva: number;
  amount_total: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  date: string;
  notes?: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  contact_id: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  notes?: string;
}
