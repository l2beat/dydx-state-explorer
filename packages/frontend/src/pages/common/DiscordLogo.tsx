import React from 'react'

export function DiscordLogo(
  props: JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>
) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#a)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20.32 4.66c-1.53-.71-3.17-1.22-4.89-1.52-.03-.01-.06.01-.08.04-.21.37-.44.86-.6 1.25-1.85-.28-3.68-.28-5.49 0-.17-.4-.41-.88-.62-1.25a.09.09 0 0 0-.08-.04c-1.71.3-3.35.81-4.88 1.52-.02 0-.03.01-.04.02C.53 9.33-.32 13.87.1 18.34c0 .03.01.05.03.06 2.05 1.51 4.04 2.42 5.99 3.03.03.01.07 0 .09-.03.46-.63.87-1.29 1.22-1.99.02-.04 0-.09-.04-.11-.65-.25-1.27-.55-1.87-.89-.05-.03-.05-.1-.01-.13.13-.09.25-.19.37-.29.03-.02.06-.02.08-.01 3.93 1.79 8.18 1.79 12.06 0 .03-.01.06-.01.08.01.12.1.25.2.37.29.05.03.04.1 0 .13-.6.35-1.22.64-1.88.89-.04.02-.06.07-.04.11.36.7.78 1.36 1.23 1.99.02.03.05.04.08.03 1.96-.61 3.95-1.52 6.01-3.03.01-.01.02-.03.03-.06.5-5.17-.84-9.67-3.55-13.66-.01-.01-.02-.02-.03-.02ZM8.02 15.62c-1.18 0-2.16-1.09-2.16-2.42 0-1.34.96-2.42 2.16-2.42 1.21 0 2.18 1.09 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.34.95-2.42 2.15-2.42 1.22 0 2.18 1.09 2.16 2.42 0 1.33-.94 2.42-2.16 2.42Z"
          fill="#FAFAFA"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h24v24H0z" />
        </clipPath>
      </defs>
    </svg>
  )
}
