// Cloudflare D1 Database Helper
// Use this in your Cloudflare Workers to interact with D1

export class D1Database {
  constructor(db) {
    this.db = db;
  }

  // Get user by username
  async getUserByUsername(username) {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE username = ?1')
      .bind(username)
      .first();
    return result;
  }

  // Get user by ID
  async getUserById(id) {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?1')
      .bind(id)
      .first();
    return result;
  }

  // Get all users
  async getAllUsers() {
    const results = await this.db
      .prepare('SELECT id, username, role, email, created_at FROM users')
      .all();
    return results.results;
  }

  // Create user
  async createUser(username, hashedPassword, role, email) {
    const result = await this.db
      .prepare(
        'INSERT INTO users (username, password, role, email) VALUES (?1, ?2, ?3, ?4)'
      )
      .bind(username, hashedPassword, role, email)
      .run();
    return result;
  }

  // Update user
  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?${paramIndex}`;
    const result = await this.db.prepare(query).bind(...values).run();
    return result;
  }

  // Delete user
  async deleteUser(id) {
    const result = await this.db
      .prepare('DELETE FROM users WHERE id = ?1')
      .bind(id)
      .run();
    return result;
  }

  // Get user's allocated brands
  async getUserBrands(userId) {
    const results = await this.db
      .prepare(
        `SELECT b.* FROM brands b
         JOIN user_allocations ua ON b.id = ua.brand_id
         WHERE ua.user_id = ?1`
      )
      .bind(userId)
      .all();
    return results.results;
  }

  // Allocate brand to user
  async allocateBrandToUser(userId, brandId, allocatedBy) {
    const result = await this.db
      .prepare(
        'INSERT INTO user_allocations (user_id, brand_id, allocated_by) VALUES (?1, ?2, ?3)'
      )
      .bind(userId, brandId, allocatedBy)
      .run();
    return result;
  }

  // Get all brands
  async getAllBrands() {
    const results = await this.db
      .prepare('SELECT * FROM brands ORDER BY brand_name')
      .all();
    return results.results;
  }

  // Get brand by ID
  async getBrandById(id) {
    const result = await this.db
      .prepare('SELECT * FROM brands WHERE id = ?1')
      .bind(id)
      .first();
    return result;
  }

  // Create brand
  async createBrand(brandName, masterOutletId, createdBy) {
    const result = await this.db
      .prepare(
        'INSERT INTO brands (brand_name, master_outlet_id, created_by) VALUES (?1, ?2, ?3)'
      )
      .bind(brandName, masterOutletId, createdBy)
      .run();
    return result;
  }

  // Get login logs for a date range
  async getLoginLogs(startDate, endDate, brandId = null) {
    let query =
      'SELECT * FROM login_logs WHERE login_date BETWEEN ?1 AND ?2';
    const params = [startDate, endDate];

    if (brandId) {
      query += ' AND brand_id = ?3';
      params.push(brandId);
    }

    query += ' ORDER BY login_date DESC';

    const results = await this.db
      .prepare(query)
      .bind(...params)
      .all();
    return results.results;
  }

  // Insert login log
  async createLoginLog(storeId, actualClientStoreId, storeName, storeNumber, loginType, loginDate, brandId) {
    const result = await this.db
      .prepare(
        `INSERT INTO login_logs 
         (store_id, actual_client_store_id, store_manager_name, store_manager_number, login_type, login_date, brand_id) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
      .bind(storeId, actualClientStoreId, storeName, storeNumber, loginType, loginDate, brandId)
      .run();
    return result;
  }
}

// Example usage in a Cloudflare Worker:
/*
export default {
  async fetch(request, env) {
    const db = new D1Database(env.DB);
    
    // Get user
    const user = await db.getUserByUsername('admin');
    
    return new Response(JSON.stringify(user));
  }
};
*/
