
class Constructor(object):

    def get_params(self):
        return {
            'hard_cap': {
                'type': 'int',
                'name': 'Mard cap',
                'desc': 'Maximum funds'
            }
        }

    def construct(self, fields):
        return [
            """
                pragma solidity ^0.4.18;
                
                contract A {
                    event Log(string msg);
                
                    function A() public {
                    
                    }
                    
                    function logthis(string msg) {
                        Log(msg);
                    }
                }
            """,
            'A'
        ]

