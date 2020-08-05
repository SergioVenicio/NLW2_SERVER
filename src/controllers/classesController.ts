import { Request, Response } from "express";

import db from "../database/connection";
import convertHourToMinutes from "../utils/convertHourToMinutes";

interface ScheduleItem {
  week_day: number;
  from: string;
  to: string;
}

export default class ClassesController {
  async create(request: Request, response: Response) {
    const {
      name,
      avatar,
      whatsapp,
      bio,
      subject,
      cost,
      schedule,
    } = request.body;
    const trx = await db.transaction();
    try {
      const user = await trx("users").insert({
        name,
        avatar,
        whatsapp,
        bio,
      });
      const newClass = await trx("classes").insert({
        subject,
        cost,
        user_id: user[0],
      });

      const classSchedule = schedule.map((scheduleItem: ScheduleItem) => {
        return {
          week_day: scheduleItem.week_day,
          from: convertHourToMinutes(scheduleItem.from),
          to: convertHourToMinutes(scheduleItem.to),
          class_id: newClass[0],
        };
      });
      await trx("class_schedule").insert(classSchedule);

      await trx.commit();
    } catch (err) {
      trx.rollback();
      console.error(err);
      return response.status(500).json({
        status: "error",
        error: "Unexpected error while creating new class!",
      });
    }

    return response.send(201).json({
      status: "Ok",
    });
  }

  async index(request: Request, response: Response) {
    const filters = request.query;

    if (!filters.week_day || !filters.subject || !filters.time) {
      return response.status(400).json({
        status: "error",
        error: "Missing filters to search classes",
      });
    }

    const time = convertHourToMinutes(filters.time as string);
    const subject = filters.subject as string;
    const week_day = filters.week_day as string;

    const classes = await db("classes")
      .whereExists(function () {
        this.select("class_schedule.*")
          .from("class_schedule")
          .whereRaw("`class_schedule`.`class_id` = `classes`.`id`")
          .whereRaw("`class_schedule`.`week_day` = ??", [Number(week_day)])
          .whereRaw("`class_schedule`.`from` <= ??", [time])
          .whereRaw("`class_schedule`.`to` > ??", [time]);
      })
      .where("classes.subject", "=", subject)
      .join("users", "classes.user_id", "=", "users.id")
      .select(["classes.*", "users.*"]);
    response.json(classes);
  }
}
