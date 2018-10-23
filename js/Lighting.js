var Lighting = function(context){
    this.context = context;
};

Lighting.prototype = {
    getLightValue:function(dot, dist, light){
        var falloff = (!!light.userData.falloff) ? light.userData.falloff : 400.0;
        var dist = dist / falloff;
        var intensity = 1 / (dist * dist);

        var midLight = 255 / 2.0;
        var maxLight = 255 - midLight;
        var colorNumber = Math.floor((midLight + (maxLight * dot)) * intensity);
        if( colorNumber > 255 )
            colorNumber = 255;
        else if( colorNumber < 0 )
            colorNumber = 0;

        return colorNumber / 255.0;
    },
    getObjectsInTheWay:function(light_pos,dir,object){

        var ray = new THREE.Raycaster( light_pos, dir);

        var intersects = ray.intersectObject ( this.context.scene_graph.container, true )

        if ( intersects.length > 0 && intersects[0].object.geometry&& intersects[0].object !== object) {
            return intersects[0];
        };
    },
    bakeVertexLighting:function(object, light){
        var _this = this;
        var output = [];
        if( !object.geometry ){
            // object.traverse(function(child){
            //     if( !!child.geometry )
            //         object = child;
            // });

            if( !object.geometry )
                return;
        }

        (object.parent||_this.context.scene_graph.container).updateMatrixWorld();

        var count = (!object.geometry.attributes) ? object.geometry.faces.length : object.geometry.attributes.position.count;
        var tint_override;
        var findParent = function(object){
            if(object.parent&&object.parent.userData.plusspace){
                return object.parent.userData.plusspace.object.tint_override;
            }else{
                return findParent(object.parent);
            }
        };
        if(object.userData.plusspace){
            tint_override = object.userData.plusspace.object.tint_override
        }else{
            tint_override = findParent(object);
        }
        if(tint_override){
            var t_hex = (tint_override||"#ffffff").replace('#','');
            var t_r = parseInt(t_hex.substring(0,2), 16);
            var t_g = parseInt(t_hex.substring(2,4), 16);
            var t_b = parseInt(t_hex.substring(4,6), 16);
        }

        var hex = (light.userData.tint||"#ffffff").replace('#','');
        var r = parseInt(hex.substring(0,2), 16);
        var g = parseInt(hex.substring(2,4), 16);
        var b = parseInt(hex.substring(4,6), 16);

        var keyLetters = ["a", "b", "c"];	// for structured geometry
        var displacement = new THREE.Vector3();	// for array geometry
        var vertexPosition = new THREE.Vector3();
        var vertexNormal = new THREE.Vector3();
        var normalLook = new THREE.Vector3();
        var lightLook = new THREE.Vector3();

        var normals = (!!object.geometry.attributes) ? object.geometry.attributes.normal.array : undefined;

        var positions = (!!object.geometry.attributes) ? object.geometry.attributes.position.array : undefined;

        var i, face, j, dot, value;
        for( i = 0; i < count; i++ ){
            if( !object.geometry.attributes )face = object.geometry.faces[i];

            for( j = 0; j < 3 || !!object.geometry.attributes; j++ ){
                // get vertexPosition
                if(!object.geometry.attributes){
                    vertexPosition.copy(object.geometry.vertices[face[keyLetters[j]]]);
                }else{
                    vertexPosition.set(positions[(3*i)], positions[(3*i) + 1], positions[(3*i) + 2]);
                }
                vertexPosition.applyMatrix4(object.matrixWorld);
                if( object.parent !== _this.context.scene_graph.container ){
                    _this.context.scene_graph.container.worldToLocal(vertexPosition);
                }

                var dist = vertexPosition.distanceTo(light.position);

                // get vertexNormal
                if( !object.geometry.attributes ){
                    vertexNormal.copy(object.geometry.vertices[face[keyLetters[j]]]);
                    if(face.vertexNormals[j])vertexNormal.add(face.vertexNormals[j]);
                }else{
                    displacement.set(normals[(3*i)], normals[(3*i) + 1], normals[(3*i) + 2]);
                    vertexPosition.set(positions[(3*i)], positions[(3*i) + 1], positions[(3*i) + 2]);
                    vertexNormal.add(displacement);
                }

                vertexNormal.applyMatrix4(object.matrixWorld);

                if( object.parent !== _this.context.scene_graph.container )
                    _this.context.scene_graph.container.worldToLocal(vertexNormal);

                // get vertexNormalLook
                normalLook.copy(vertexPosition);
                normalLook.sub(vertexNormal);
                normalLook.normalize();

                // get vertexLightLook
                lightLook.copy(vertexPosition);
                lightLook.sub(light.position);
                lightLook.normalize();

                // get dot
                dot = normalLook.dot(lightLook);
                value = _this.getLightValue(dot, dist, light);	// a light value between 0.0 and 1.0

                //var dir = new THREE.Vector3();
                //var inter_object = _this.getObjectsInTheWay(light.position,dir.subVectors( vertexPosition, light.position ).normalize(),object);
                output.push(value);
                if( !object.geometry.attributes ){
                    value = parseInt(255 * value);
                    value = Math.floor(value*0.8)+30;

                    if(tint_override){
                        value = "rgb(" + Math.round(((r*(value/255))*t_r)/255) + ", " + Math.round(((g*(value/255))*t_g)/255) + ", " + Math.round(((b*(value/255))*t_b)/255) + ")";
                    }else{
                        value = "rgb(" + Math.round(r*(value/255)) + ", " + Math.round(g*(value/255)) + ", " + Math.round(b*(value/255)) + ")";
                    }
                    if(!!face.vertexColors[j]){
                        face.vertexColors[j].set(value);
                    }else{
                        face.vertexColors[j] = new THREE.Color(value);
                    }

                    object.geometry.colorsNeedUpdate = true;
                }else{
                    if(object.geometry.attributes.color){
                        // var
                        // if(tint_override){
                        //     value = "rgb(" + Math.round(((r*(value/255))*t_r)/255) + ", " + Math.round(((g*(value/255))*t_g)/255) + ", " + Math.round(((b*(value/255))*t_b)/255) + ")";
                        // }else{
                        //     value = "rgb(" + Math.round(r*(value/255)) + ", " + Math.round(g*(value/255)) + ", " + Math.round(b*(value/255)) + ")";
                        // }
                        object.geometry.attributes.color.array[(3*i)] = value;
                        object.geometry.attributes.color.array[(3*i) + 1] = value;
                        object.geometry.attributes.color.array[(3*i) + 2] = value;
                        object.geometry.attributes.color.needsUpdate = true;

                    }
                    break;
                }
            }
        }
        return output;
    },
};