const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const pddlActionIntention = require('../pddl/actions/pddlActionIntention')

/**
 * @class Person
 * 
 * Attribute 'in_room' specifies in which room is the person, 'is_sleeping' specifies if the person is sleeping
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


/**
 * @class PersonDetectionGoal
 */
class PersonDetectionGoal extends Goal {
    constructor(people) {
        super()

        this.people = people
    }
}

/**
 * @class PersonDetectionIntention
 * Detects the presence of each person in each room.
 * Declare in the agent beliefest `person_in_room person_name room_name` 
 * to specify the room in which the person is.
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
                        this.agent.beliefs.undeclare(literal) // undeclare the previous position of the person
                    }
                    this.agent.beliefs.declare(`person_in_room ${person.name} ${room}`)
                }
            });

            people_promises.push(person_promise)
        }
        yield Promise.all(people_promises)
    }
}


/**
 * @class SomeoneInRoomDetectionGoal
 */
class SomeoneInRoomDetectionGoal extends Goal {
    constructor(people, rooms) {
        super()

        this.people = people
        this.rooms = rooms
    }
}

/**
 * @class SomeoneInRoomDetectionIntention
 * Detects the presence of people in each room.
 * Declare in the agent beliefest `someone_in_room room_name` and not `free_room room_name`
 * when there is someone in the room. The predicate `free_room` is necessary in order to not
 * have negative preconditions.
 */
class SomeoneInRoomDetectionIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.people = this.goal.people
        this.rooms = this.goal.rooms
    }

    static applicable(goal) {
        return goal instanceof SomeoneInRoomDetectionGoal
    }

    *exec() {
        for (let [name, room] of Object.entries(this.rooms)) {
            this.someone_detected(room) // set initial knowledge
        }

        var promises = []
        for (let [name, person] of Object.entries(this.people)) {
            let promise = new Promise(async res => {
                while (true) {
                    await person.notifyChange('in_room')
                    for (let [name, room] of Object.entries(this.rooms)) {
                        this.someone_detected(room)
                    }
                }
            });

            promises.push(promise)
        }
        yield Promise.all(promises)
    }

    someone_detected(room) {
        for (let [name, person] of Object.entries(this.people)) {
            if (person.in_room == room.name) {
                this.agent.beliefs.declare(`someone_in_room ${room.name}`)
                this.agent.beliefs.undeclare(`free_room ${room.name}`)
                return true
            }
        }

        this.agent.beliefs.undeclare(`someone_in_room ${room.name}`)
        this.agent.beliefs.declare(`free_room ${room.name}`)
        return false
    }
}


/**
 * @class SleepingSensingGoal
 */
class SleepingSensingGoal extends Goal {
    constructor(people) {
        super()

        this.people = people
    }
}

/**
 * @class SleepingSensingIntention
 * Detect when a person is sleeping.
 * Declare in the agent beliefest `is_sleeping person_name` when the person is sleeping.
 */
class SleepingSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.people = this.goal.people
    }

    static applicable(goal) {
        return goal instanceof SleepingSensingGoal
    }

    *exec() {
        var promises = []
        for (let [name, person] of Object.entries(this.people)) {
            this.agent.beliefs.declare(`is_sleeping ${person.name}`, person.is_sleeping)
            let promise = new Promise(async res => {
                while (true) {
                    await person.notifyChange('is_sleeping')
                    this.agent.beliefs.declare(`is_sleeping ${person.name}`, person.is_sleeping)
                }
            });
            promises.push(promise)
        }

        yield Promise.all(promises)
    }
}


class Move extends pddlActionIntention {

    *exec({ person, r1, r2 } = parameters) {
        if (this.checkPrecondition()) {
            this.agent.devices.person.moveTo(r2)
            yield new Promise(res => setTimeout(res, 0))
        }
        else
            throw new Error('pddl precondition not valid'); //Promise is rejected!
    }

    static parameters = ['person', 'r1', 'r2']
    static precondition = [['person_in_room', 'person', 'r1'], ['connected', 'r1', 'r2']]
    static effect = [['not person_in_room', 'person', 'r1'], ['person_in_room', 'person', 'r2']]

}

module.exports = {
    Person,
    PersonDetectionGoal, PersonDetectionIntention,
    SomeoneInRoomDetectionGoal, SomeoneInRoomDetectionIntention,
    SleepingSensingGoal, SleepingSensingIntention,
    Move
}