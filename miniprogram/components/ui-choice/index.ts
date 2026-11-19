Component({options:{multipleSlots:true,styleIsolation:'apply-shared'},properties:{active:Boolean,disabled:Boolean},methods:{press(){if(!this.data.disabled)this.triggerEvent('press')}}});
