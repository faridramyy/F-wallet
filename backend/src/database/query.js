import pool from "./pool.js";

const query = async (text, params = []) => {
  return pool.query(text, params);
};

export default query;
