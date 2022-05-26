const Observable =  require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')


class IrrigationSystem extends Observable {
    constructor(name, room){
        let init = {name: name, room: room, status: 'off'}
        super(init)
    }

    turnOn(){
        if(this.status == 'off'){
            this.status = 'on'
        }
    }
    turnOff(){
        if(this.status == 'on'){
            this.status = 'off'
        }
    }
}


class IrrigationControlGoal extends Goal {
    constructor (irrigation_system, garden, weather) {
        super()

        this.irrigation_system = irrigation_system
        this.garden = garden
        this.weather = weather
    }
}

class IrrigationControlIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)

        this.irrigation_system = this.goal.irrigation_system
        this.garden = this.goal.garden
        this.weather = this.goal.weather
    }
    
    static applicable (goal) {
        return goal instanceof IrrigationControlGoal
    }

    *exec () {
        let promise = new Promise( async res => {
            while (true) {
                await Clock.global.notifyChange('mm')
                if(Clock.global.hh >= 6 && Clock.global.mm < 30 && Clock.global.dd-2 >= this.weather.last_day_has_rained && 
                        Clock.global.dd-2 >= this.garden.last_day_received_water && this.weather.raining_next24h==false){
                    if(this.irrigation_system.status == 'off'){
                        this.irrigation_system.turnOn()
                        this.garden.giveWater()
                        this.agent.beliefs.declare(`giving_water`)
                        this.log("giving water to garden and plants")
                    }
                } else {
                    if(this.irrigation_system.status == 'on'){
                        this.irrigation_system.turnOff()
                        this.agent.beliefs.undeclare(`giving_water`)
                        this.log("stop giving water to garden and plants")
                    }
                }
            }
        });

        yield Promise.all([promise])
    }

}

module.exports = {IrrigationSystem, IrrigationControlGoal, IrrigationControlIntention}