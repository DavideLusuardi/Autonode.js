const pddlActionIntention = require('../pddl/actions/pddlActionIntention')
const Observable = require('../utils/Observable')
const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')

/**
 * @class VacuumCleanerDevice
 * A vacuum cleaner can move between rooms and clean them.
 */
class VacuumCleanerDevice extends Observable {
    constructor(name, room, rooms) {
        let init = { name: name, at: room.name }
        super(init)
        this.rooms = rooms
    }

    /**
     * 
     * @param {String} room_name The room to clean
     */
    suck(room_name) {
        this.rooms[room_name].clean()
    }

    /**
     * 
     * @param {String} room_name The room to which move
     */
    move(room_name) {
        this.at = room_name
    }
}


/**
 * @class VacuumSensingGoal
 */
class VacuumSensingGoal extends Goal {
    constructor(rooms, people) {
        super()

        this.rooms = rooms
        this.people = people
    }
}

/**
 * @class VacuumSensingIntention
 * Detect the dirt in each room and the position of the vacuum cleaner in the house.
 * The vacuum cannot clean the room when there is someone.
 * Declare in the agent beliefset `dirty room_name` to specify that the room is to clean and
 * `at room_name` to specify the position of the vacuum cleaner.
 */
class VacuumSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.rooms = this.goal.rooms
        this.people = this.goal.people
    }

    static applicable(goal) {
        return goal instanceof VacuumSensingGoal
    }

    *exec() {
        var promises = []
        for (let [name, room] of Object.entries(this.rooms)) {
            this.agent.beliefs.declare(`dirty ${room.name}`, room.dirt)
            let promise = new Promise(async res => {
                while (true) {
                    let dirt = await room.notifyChange('dirt')
                    this.agent.beliefs.declare(`dirty ${room.name}`, room.dirt)
                }
            });
            promises.push(promise)
        }

        this.agent.beliefs.declare(`at ${this.agent.devices.vacuum_cleaner.at}`)
        let promise = new Promise(async res => {
            while (true) {
                await this.agent.devices.vacuum_cleaner.notifyChange('at')
                for (let literal of this.agent.beliefs.matchingLiterals(`at *`)) {
                    this.agent.beliefs.undeclare(literal)
                }
                this.agent.beliefs.declare(`at ${this.agent.devices.vacuum_cleaner.at}`)
            }
        });
        promises.push(promise)

        yield Promise.all(promises)
    }
}

class SuckGoal extends Goal { }
class Suck extends pddlActionIntention {

    static applicable(goal) {
        return goal instanceof SuckGoal
    }

    *exec({ r } = parameters) {
        if (this.checkPrecondition()) {
            this.agent.devices.vacuum_cleaner.suck(r)
            yield new Promise(res => setTimeout(res, 0))
        }
        else
            throw new Error('pddl precondition not valid'); //Promise is rejected!        
    }

    static parameters = ['r']
    static precondition = [['free_room', 'r'], ['dirty', 'r'], ['at', 'r']]
    static effect = [['not dirty', 'r']]

}

class MoveGoal extends Goal { }
class Move extends pddlActionIntention {

    static applicable(goal) {
        return goal instanceof MoveGoal
    }

    *exec({ r1, r2 } = parameters) {
        if (this.checkPrecondition()) {
            this.agent.devices.vacuum_cleaner.move(r2)
            yield new Promise(res => setTimeout(res, 0))
        }
        else
            throw new Error('pddl precondition not valid'); //Promise is rejected!        
    }

    static parameters = ['r1', 'r2']
    static precondition = [['at', 'r1'], ['connected', 'r1', 'r2']]
    static effect = [['not at', 'r1'], ['at', 'r2']]

}


module.exports = { 
    VacuumCleanerDevice, 
    VacuumSensingGoal, VacuumSensingIntention, 
    SuckGoal, Suck, MoveGoal, Move 
}