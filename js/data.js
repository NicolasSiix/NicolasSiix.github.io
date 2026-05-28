/* ============================================================
   AGULHAS NEGRAS — SQUAD ITU
   data.js — Configuração do Supabase
   ============================================================ */

const SUPABASE_URL  = 'https://thbtspzsmnculgqdswte.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYnRzcHpzbW5jdWxncWRzd3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDA1NzUsImV4cCI6MjA5NDk3NjU3NX0.I_UFinKFvzIiUcqgNiwshmD7UHpfOZ0TVrrP82rnOJs';

const BASE_HEADERS = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_ANON,
  'Authorization': 'Bearer ' + SUPABASE_ANON
};

const DB = {
  async get(table, query = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
    console.log('[DB GET]', url);
    const res = await fetch(url, { headers: BASE_HEADERS });
    if (!res.ok) {
      const err = await res.text();
      console.error('[DB GET ERROR]', err);
      throw new Error(err);
    }
    const data = await res.json();
    console.log('[DB GET RESULT]', table, data);
    return data;
  },

  async post(table, body) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    console.log('[DB POST]', url, body);
    const res = await fetch(url, {
      method:  'POST',
      headers: { ...BASE_HEADERS, 'Prefer': 'return=representation' },
      body:    JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[DB POST ERROR]', err);
      throw new Error(err);
    }
    const data = await res.json();
    console.log('[DB POST RESULT]', data);
    return data;
  },

  async patch(table, id, body) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    console.log('[DB PATCH]', url, body);
    const res = await fetch(url, {
      method:  'PATCH',
      headers: { ...BASE_HEADERS, 'Prefer': 'return=representation' },
      body:    JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[DB PATCH ERROR]', err);
      throw new Error(err);
    }
    const data = await res.json();
    console.log('[DB PATCH RESULT]', data);
    return data;
  },

  async delete(table, id) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    console.log('[DB DELETE]', url);
    const res = await fetch(url, {
      method:  'DELETE',
      headers: { ...BASE_HEADERS, 'Prefer': 'return=representation' }
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[DB DELETE ERROR]', err);
      throw new Error(err);
    }
    return true;
  },

  async deleteWhere(table, field, value) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${field}=eq.${value}`;
    console.log('[DB DELETE WHERE]', url);
    const res = await fetch(url, {
      method:  'DELETE',
      headers: { ...BASE_HEADERS, 'Prefer': 'return=representation' }
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[DB DELETE WHERE ERROR]', err);
      throw new Error(err);
    }
    return true;
  }
};

// Arrays em memória — preenchidos ao carregar a página
let games   = [];
let members = [];
