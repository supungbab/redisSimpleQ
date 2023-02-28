class RedisSimpleQ {
  constructor(name) {
    this.name = name;
    this.queue = `sq:${this.name}:queue`;
    this.active = `sq:${this.name}:active`;
    this.q = REDIS.conn(9);
  }
  async init(...data) {
    await Promise.all([this.delete(), this.q.SET(this.active, 0), this.push(...data)]);
    return this;
  }
  async getActive(key) {
    return this.q.get(key);
  }
  async push(...data) {
    return this.q.RPUSH(this.queue, ...data);
  }
  async pop() {
    return new Promise((resolve, reject) => {
      this.q.LPOP(this.queue, (err, result) => {
        if (result === undefined) {
          reject(err);
        } else {
          if (result) {
            this.counter(this.active, 1);
          }
          resolve(result);
        }
      });
    });
  }
  async counter(key, num) {
    return this.q.incrby(key, num);
  }
  async length() {
    return new Promise((resolve, reject) => {
      this.q.LLEN(this.queue, (err, result) => {
        if (result === undefined) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
  async delete() {
    return this.q.DEL(this.queue);
  }
  async pendingPop() {
    let length, active;
    do {
      const data = await this.pop();
      const result = await Promise.all([this.length(), this.getActive(this.active)]);

      if (data) {
        return data;
      }
      length = result[0];
      active = Number(result[1] || 0);
    } while (length || (active > 0));
  }
}
