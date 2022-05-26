const pddlActionIntention = require('../pddl/actions/pddlActionIntention')
const Observable =  require('../utils/Observable')
const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')

class VacuumCleanerDevice extends Observable {
    constructor(name, room, rooms){
        let init = {name: name, at: room.name}
        super(init)
        this.rooms = rooms
    }

    suck(room_name){
        this.rooms[room_name].clean()
    }

    move(room_name){
        this.at = room_name    
    }
}


class SensingGoal extends Goal {
    constructor (rooms, people) {
        super()

        this.rooms = rooms
        this.people = people
    }
}

class SensingIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)

        this.rooms = this.goal.rooms
        this.people = this.goal.people
    }
    
    static applicable (goal) {
        return goal instanceof SensingGoal
    }

    *exec () {
        var promises = []
        for (let [name, room] of Object.entries(this.rooms)){
            for(let to of room.doors_to)
                this.agent.beliefs.declare(`connected ${room.name} ${to}`)

            this.agent.beliefs.declare(`dirty ${room.name}`, room.dirt)
            let promise = new Promise( async res => {
                while (true) {
                    let dirt = await room.notifyChange('dirt')
                    this.agent.beliefs.declare(`dirty ${room.name}`, room.dirt)
                }
            });
            promises.push(promise)
        }
        
        this.agent.beliefs.declare(`at ${this.agent.devices.vacuum_cleaner.at}`)
        let promise = new Promise( async res => {
            while (true) {
                await this.agent.devices.vacuum_cleaner.notifyChange('at')
                for(let literal of this.agent.beliefs.matchingLiterals(`at *`)){
                    this.agent.beliefs.undeclare(literal)
                }
                this.agent.beliefs.declare(`at ${this.agent.devices.vacuum_cleaner.at}`)
            }
        });
        promises.push(promise)

        for (let [name, room] of Object.entries(this.rooms)){
            this.agent.beliefs.declare(`cleanable ${room.name}`, this.someone_detected(room)==false)
            for (let [name, person] of Object.entries(this.people)){
                let promise = new Promise( async res => {
                    while (true) {
                        await person.notifyChange('in_room')
                        this.agent.beliefs.declare(`cleanable ${room.name}`, this.someone_detected(room)==false)
                    }
                });
    
                promises.push(promise)
            }
        }

        yield Promise.all(promises)
    }

    someone_detected(room){
        for (let [name, person] of Object.entries(this.people)){
            if(person.in_room == room.name)
                return true
        }
        return false
    }
}

class SuckGoal extends Goal {}
class Suck extends pddlActionIntention {

    static applicable (goal) {
        return goal instanceof SuckGoal
    }

    *exec ({r}=parameters) {
        this.agent.devices.vacuum_cleaner.suck(r)
        yield new Promise(res=>setTimeout(res,100))
    }

    static parameters = ['r']
    static precondition = [ ['cleanable', 'r'], ['dirty', 'r'], ['at', 'r'] ]
    static effect = [ ['not dirty', 'r'] ]

}

class MoveGoal extends Goal {}
class Move extends pddlActionIntention {

    static applicable (goal) {
        return goal instanceof MoveGoal
    }

    *exec ({r1, r2}=parameters) {
        this.agent.devices.vacuum_cleaner.move(r2)
        yield new Promise(res=>setTimeout(res,100))
    }

    static parameters = ['r1', 'r2']
    static precondition = [ ['at', 'r1'], ['connected', 'r1', 'r2'] ]
    static effect = [ ['not at', 'r1'], ['at', 'r2'] ]

}


module.exports = {VacuumCleanerDevice, SensingGoal, SensingIntention, SuckGoal, Suck, MoveGoal, Move}