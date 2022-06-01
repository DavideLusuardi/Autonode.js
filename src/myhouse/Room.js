const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')

/**
 * @class Room
 */
class Room extends Observable {
    constructor(name, floor, doors_to, dirt) {
        super()
        this.name = name;
        this.floor = floor
        this.doors_to = doors_to
        this.set('dirt', dirt)
    }

    clean() {
        this.dirt = false
    }

    dirty() {
        this.dirt = true
    }
}


/**
 * @class RoomConnectionGoal
 */
 class RoomConnectionGoal extends Goal {
    constructor(rooms) {
        super()

        this.rooms = rooms
    }
}

/**
 * @class RoomConnectionIntention
 * Initialize room connections in the agent beliefset.
 */
class RoomConnectionIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.rooms = this.goal.rooms
    }

    static applicable(goal) {
        return goal instanceof RoomConnectionGoal
    }

    *exec() {
        for (let room of this.rooms) {
            for (let to of room.doors_to)
                this.agent.beliefs.declare(`connected ${room.name} ${to}`)
        }

        yield Promise.all([])
    }
}

module.exports = {Room, RoomConnectionGoal, RoomConnectionIntention}