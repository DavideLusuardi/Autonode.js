const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const pddlActionIntention = require('../pddl/actions/pddlActionIntention')

/**
 * @class Person
 */
class Person extends Observable {
    constructor(house, name, in_room, is_sleeping) {
        super()
        this.house = house;             // reference to the house
        this.name = name;               // non-observable
        this.set('in_room', in_room)    // observable
        this.set('is_sleeping', is_sleeping)  // observable
    }

    /**
     * Move to another room if there is a door that connects the two rooms
     */
    moveTo(to) {
        if (this.house.rooms[this.in_room].doors_to.includes(to)) {
            // console.log(this.name, 'moved from', this.in_room, 'to', to)
            this.in_room = to
            return true
        }
        else {
            console.log(this.name, 'failed moving from', this.in_room, 'to', to)
            return false
        }
    }

    wakeUp() {
        this.is_sleeping = false
    }

    goSleep() {
        this.is_sleeping = true
    }
}


class PersonDetectionGoal extends Goal {
    constructor(people) {
        super()

        this.people = people

    }
}

/**
 * @class PersonDetectionIntention
 * Detects the presence of people in each room.
 */
class PersonDetectionIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.people = this.goal.people
    }

    static applicable(goal) {
        return goal instanceof PersonDetectionGoal
    }

    *exec() {
        var people_promises = []
        for (let [name, person] of Object.entries(this.people)) {
            this.agent.beliefs.declare(`person_in_room ${person.name} ${person.in_room}`) // set initial knowledge

            let person_promise = new Promise(async res => {
                while (true) {
                    let room = await person.notifyChange('in_room')
                    this.log(person.name + ' moved into ' + room)
                    for (let literal of this.agent.beliefs.matchingLiterals(`person_in_room ${person.name} *`)) {
                        this.agent.beliefs.undeclare(literal)
                    }
                    this.agent.beliefs.declare(`person_in_room ${person.name} ${room}`)
                }
            });

            people_promises.push(person_promise)
        }
        yield Promise.all(people_promises)
    }
}


class SensingGoal extends Goal {
    constructor(person, rooms) {
        super()

        this.person = person
        this.rooms = rooms
    }
}

/**
 * @class SensingIntention
 * Detect where a person is. 
 */
class SensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.person = this.goal.person
        this.rooms = this.goal.rooms
    }

    static applicable(goal) {
        return goal instanceof SensingGoal
    }

    *exec() {
        var promises = []

        for (let [name, room] of Object.entries(this.rooms)) { // init rooms connections
            for (let to of room.doors_to)
                this.agent.beliefs.declare(`connected ${room.name} ${to}`)
        }

        this.agent.beliefs.declare(`in_room ${this.person.in_room}`)
        let promise = new Promise(async res => {
            while (true) {
                await this.person.notifyChange('in_room')
                for (let literal of this.agent.beliefs.matchingLiterals(`in_room *`)) {
                    this.agent.beliefs.undeclare(literal)
                }
                this.agent.beliefs.declare(`in_room ${this.person.in_room}`)
            }
        });
        promises.push(promise)

        yield Promise.all(promises)
    }
}

class Move extends pddlActionIntention {

    *exec({ r1, r2 } = parameters) {
        if (this.checkPrecondition()) {
            this.agent.devices.person.moveTo(r2)
            yield new Promise(res => setTimeout(res, 0))
        }
        else
            throw new Error('pddl precondition not valid'); //Promise is rejected!
    }

    static parameters = ['r1', 'r2']
    static precondition = [['in_room', 'r1'], ['connected', 'r1', 'r2']]
    static effect = [['not in_room', 'r1'], ['in_room', 'r2']]

}

module.exports = { Person, PersonDetectionGoal, PersonDetectionIntention, SensingGoal, SensingIntention, Move }