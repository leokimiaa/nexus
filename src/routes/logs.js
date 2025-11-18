const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all event logs
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_logs')
      .select(`
        *,
        listeners (
          name,
          source_table,
          event
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;