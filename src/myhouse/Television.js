const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')
const Observable =  require('../utils/Observable')


class TelevisionDevice extends Observable {
    constructor(name, room, consumption, electricity_utility){
        let init = {name:name, room: room, status: 'off', channel:1, consumption:consumption}
        super(init)

        this.electricity_utility = electricity_utility
        this.consumption_callback = () => {
            let consumption = this.consumption/(60/Clock.getIncrement().mm) // calculate consumption every clock increment
            this.electricity_utility.consumption += consumption
        }
    }

    turnOn(channel=undefined){
        if(this.status == 'off'){
            this.status = 'on'
            if(channel)
                this.channel = channel
            Clock.global.observe('mm', this.consumption_callback)
            return this.channel
        }
    }
    turnOff(){
        if(this.status == 'on'){
            this.status = 'off'
            Clock.global.unobserve('mm', this.consumption_callback)
        }
    }
}

class TelevisionControlGoal extends Goal {
    constructor (television, people, lights_TV) {
        super()

        this.television = television
        this.people = people
        this.lights_TV = lights_TV
    }
}

class TelevisionControlIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)

        this.television = this.goal.television
        this.people = this.goal.people
        this.lights_TV = this.goal.lights_TV
    }
    
    static applicable (goal) {
        return goal instanceof TelevisionControlGoal
    }

    *exec () {
        this.agent.beliefs.declare('television_on', this.television.status=='on')
        this.agent.beliefs.declare(`television_channel ${this.television.channel}`)
        this.controlTelevision() // set initial knowledge

        var promises = []
        for (let [name, person] of Object.entries(this.people)){
            let promise = new Promise( async res => {
                while (true) {
                    let person_in_room = await this.agent.beliefs.notifyChange(`person_in_room ${person.name} ${this.television.room.name}`)
                    this.controlTelevision()
                }
            });
            promises.push(promise)
        }
        
        yield Promise.all(promises)
    }

    controlTelevision(){
        let people_in_livingroom = this.agent.beliefs.matchingLiterals(`person_in_room * ${this.television.room.name}`)
        let someone_in_livingroom = false
        for(let literal of people_in_livingroom){
            if(this.agent.beliefs[literal]){
                someone_in_livingroom = true
                break
            }
        }

        if(!someone_in_livingroom && this.agent.beliefs['television_on']){
            this.television.turnOff()
            this.lights_TV.turnOff()
            this.agent.beliefs.undeclare('television_on')
            this.agent.beliefs.undeclare(`light_on ${this.lights_TV.name}`)
            this.log('television off')
            this.log('television lights off')
        }

        if(someone_in_livingroom && Clock.global.hh >= 6 && Clock.global.hh <= 9){
            this.television.turnOn('News24')
            this.agent.beliefs.declare('television_on')
            this.agent.beliefs.declare(`television_channel News24`)
            this.log('television on, channel News24')
        }

        if(someone_in_livingroom && Clock.global.hh >= 20){
            let channel = this.television.turnOn()
            this.lights_TV.turnOn()
            this.agent.beliefs.declare('television_on')
            this.agent.beliefs.declare(`television_channel ${channel}`)
            this.agent.beliefs.declare(`light_on ${this.lights_TV.name}`)
            this.log('television on, channel '+channel)
            this.log('television lights on')
        }
        
    }
}

module.exports = {TelevisionDevice, TelevisionControlGoal, TelevisionControlIntention}