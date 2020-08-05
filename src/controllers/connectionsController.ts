import { Request, Response } from "express";

import db from "../database/connection";

export default class ConnectionsController {
  async index(request: Request, response: Response) {
    const totalConnections = await db("connections").count("* as total");
    const { total } = totalConnections[0];
    return response.json({
      total,
    });
  }
  async create(request: Request, response: Response) {
    const trx = await db.transaction();
    const { user_id } = request.body;

    try {
      await trx("connections").insert({
        user_id,
      });
      await trx.commit();
      return response.status(201).json({ status: "Ok" });
    } catch (error) {
      trx.rollback();
      console.error(error);
      return response.status(500).json({
        status: "error",
        error: "Unexpected error to create connection",
      });
    }
  }
}
