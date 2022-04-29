const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')
const Observable =  require('../utils/Observable')


class LightDevice extends Observable {
    constructor(name, room, consumption){
        let init = {name:name, room: room, status: 'off', consumption:consumption}
        super(init)
    }

    turnOn(){
        this.status = 'on'
    }
    turnOff(){
        this.status = 'off'
    }
}

class LightControlGoal extends Goal {
    constructor (lights, rooms, people) {
        super()

        this.lights = lights
        this.rooms = rooms
        this.people = people
    }
}

class LightControlIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)

        this.lights = this.goal.lights
        this.rooms = this.goal.rooms
        this.people = this.goal.people
    }
    
    static applicable (goal) {
        return goal instanceof LightControlGoal
    }

    *exec () {
        this.adaptLights() // set initial knowledge

        var promises = []
        for (let [name, light] of Object.entries(this.lights)){

            let brightness_promise = new Promise( async res => {
                while (true) {
                    let brightness_high = await this.agent.beliefs.notifyChange(`brightness_high ${light.room.name}`)
                    this.adaptLights()
                }
            });
            promises.push(brightness_promise)

            for(let [name, person] of Object.entries(this.people)){
                let person_promise = new Promise( async res => {
                    while (true) {
                        let person_in_room = await this.agent.beliefs.notifyChange(`person_in_room ${person.name} ${light.room.name}`)
                        this.adaptLights()
                    }
                });
                promises.push(person_promise)
            }
        }
        
        yield Promise.all(promises)
    }

    adaptLights(){
        for(let [name, room] of Object.entries(this.rooms)){
            for(let [name, light] of Object.entries(this.lights)){
                if(light.room.name != room.name)
                    continue

                let brightness_high = this.agent.beliefs.check(`brightness_high ${light.room.name}`)

                let someone_in_room = false
                for(let [name, person] of Object.entries(this.people)){
                    if(this.agent.beliefs.check(`person_in_room ${person.name} ${light.room.name}`)){
                        someone_in_room = true
                        break
                    }
                }

                if(someone_in_room && !brightness_high){
                    if(light.status == 'off'){
                        light.turnOn()
                        this.agent.beliefs.declare(`light_on ${light.name}`)
                        this.log('lights turned on in room ' + light.room.name)
                    }
                } else if(light.status == 'on'){
                    light.turnOff()
                    this.agent.beliefs.undeclare(`light_on ${light.name}`)
                    this.log('lights turned off in room ' + light.room.name)
                }
                    
            }
        }

    }
}

module.exports = {LightDevice, LightControlGoal, LightControlIntention}