const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const {
  validateListener,
  validateUUID,
  handleValidationErrors,
} = require('../middleware/validators');

// GET all listeners
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('listeners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Error fetching listeners:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST create a new listener
router.post(
  '/',
  validateListener,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, source_table, event, target_url } = req.body;

      const { data, error } = await supabase
        .from('listeners')
        .insert([
          {
            name,
            source_table,
            event,
            target_type: 'WEBHOOK',
            target_url,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        message: 'Listener created successfully',
        data,
      });
    } catch (error) {
      console.error('Error creating listener:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// DELETE a listener
router.delete(
  '/:id',
  validateUUID,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('listeners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting listener:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;