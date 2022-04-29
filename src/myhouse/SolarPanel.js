const Observable =  require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')


class SolarPanelDevice extends Observable {
    constructor(name){
        let init = {name:name, status: 'inactive', production: 5000}
        super(init)
    }

    activate(){
        this.status = 'active'
    }

    deactivate(){
        this.status = 'inactive'
    }

    initialize(people, devices){
        Clock.global.observe('hh', (hh, key) => {
            if(hh >= 8 && hh <= 17){
                if(this.status == 'inactive')
                    this.status = 'active'
            } else {
                if(this.status == 'active')    
                    this.status == 'inactive'
            }
        })
    }
}


class SolarPanelMonitorGoal extends Goal {
    constructor (solar_panel) {
        super()
        
        this.solar_panel = solar_panel
    }
}

class SolarPanelMonitorIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)

        this.solar_panel = this.goal.solar_panel
    }
    
    static applicable (goal) {
        return goal instanceof SolarPanelMonitorGoal
    }

    *exec () {
        this.agent.beliefs.declare(`solar_panel_active`, this.solar_panel.status=='active') // set initial knowledge

        let promise = new Promise( async res => {
            while (true) {
                let hh = await Clock.global.notifyChange('hh')
                
                if(hh >= 8 && hh <= 17){
                    if(this.status == 'inactive'){
                        this.solar_panel.activate()
                        this.agent.beliefs.declare(`solar_panel_active`)
                        this.log('solar_panel active')
                    }
                } else {
                    if(this.status == 'active'){
                        this.solar_panel.deactivate()
                        this.agent.beliefs.undeclare(`solar_panel_active`)
                        this.log('solar_panel inactive')
                    }
                }

            }
        });
        
        yield Promise.all([promise])
    }
}

module.exports = {SolarPanelDevice, SolarPanelMonitorGoal, SolarPanelMonitorIntention}