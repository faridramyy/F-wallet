import pool from "./pool.js";

const transaction = async (callback) => {
  return pool.transaction(callback);
};

export default transaction;
