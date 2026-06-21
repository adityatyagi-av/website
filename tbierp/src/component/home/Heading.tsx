import React from 'react'

const Heading = ({head}: {head: string}) => {
  return (
    <div className='flex justify-center my-5 lg:my-10 lg:mt-20'>
      <h1 className="font-sans max-w-[62%] bg-[linear-gradient(83.79deg,#1B45B4_3.25%,#1C2792_96.85%)] bg-clip-text text-transparent font-semibold text-[20px] sm:text-[40px] lg:text-[62px] lg:leading-[70px] tracking-[0] text-center">{head}</h1>
    </div>
  )
}

export default Heading
