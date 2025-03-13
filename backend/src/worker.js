import { Router } from 'itty-router';

// Create a new router
const router = Router();

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-app-name.pages.dev',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS requests
router.options('*', () => new Response(null, { headers: corsHeaders }));

// Bills routes
router.get('/api/bills', async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM bills ORDER BY id DESC'
    ).all();
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

router.post('/api/bills', async (request, env) => {
  try {
    const data = await request.json();
    const { success } = await env.DB.prepare(`
      INSERT INTO bills (
        bill_type, customer_name, customer_nic, customer_address,
        model_name, motor_number, chassis_number, bike_price,
        down_payment, bill_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.bill_type,
      data.customer_name,
      data.customer_nic,
      data.customer_address,
      data.model_name,
      data.motor_number,
      data.chassis_number,
      data.bike_price,
      data.down_payment,
      new Date().toISOString()
    ).run();

    return new Response(JSON.stringify({ success }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Add more routes as needed...

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export the worker
export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
}; 